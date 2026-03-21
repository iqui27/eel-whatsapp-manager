'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  RefreshCw,
  Send,
  Loader2,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Tag,
  Crown,
} from 'lucide-react';
import type { WhatsappGroup, GroupMessage } from '@/db/schema';

interface Participant {
  id: string;
  admin: string | null;
  phone: string;
}

interface SegmentInfo {
  id: string;
  name: string;
  segmentTag: string | null;
  audienceCount: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
      status === 'active'   ? 'bg-green-500/10 text-green-700 border-green-200' :
      status === 'full'     ? 'bg-red-500/10 text-red-700 border-red-200' :
                              'bg-muted text-muted-foreground border-border',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full',
        status === 'active' ? 'bg-green-500' :
        status === 'full'   ? 'bg-red-500' : 'bg-muted-foreground',
      )} />
      {status === 'active' ? 'Ativo' : status === 'full' ? 'Cheio' : 'Arquivado'}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  if (!sentiment) return null;
  const map: Record<string, { label: string; className: string }> = {
    positive: { label: 'Positivo', className: 'bg-green-500/10 text-green-700 border-green-200' },
    neutral:  { label: 'Neutro',   className: 'bg-muted text-muted-foreground border-border' },
    negative: { label: 'Negativo', className: 'bg-red-500/10 text-red-700 border-red-200' },
  };
  const { label, className } = map[sentiment] ?? { label: sentiment, className: 'bg-muted text-muted-foreground border-border' };
  return <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium', className)}>{label}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [group, setGroup] = useState<WhatsappGroup | null>(null);
  const [segment, setSegment] = useState<SegmentInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load group
  useEffect(() => {
    fetch(`/api/groups/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const g: WhatsappGroup | null = data?.group ?? null;
        setGroup(g);
        setLoadingGroup(false);
        if (g?.segmentTag) {
          fetch(`/api/segments?tag=${encodeURIComponent(g.segmentTag)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((seg) => { if (seg && !seg.error) setSegment(seg); })
            .catch(() => {});
        }
      })
      .catch(() => { setLoadingGroup(false); });
  }, [id]);

  // Load messages from DB
  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/groups/${id}/messages`);
      if (res.ok) {
        const data = await res.json() as { messages: GroupMessage[] };
        setMessages(data.messages ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoadingMessages(false); }
  }, [id]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => { void loadMessages(); }, 10_000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMembers = useCallback(async () => {
    if (!group) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/groups/${id}/members`);
      if (res.ok) {
        const data = await res.json() as { participants: Participant[] };
        setParticipants(data.participants ?? []);
      } else {
        toast.error('Erro ao carregar membros');
      }
    } catch { toast.error('Erro ao carregar membros'); }
    finally { setLoadingMembers(false); }
  }, [group, id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/groups/${id}/sync`, { method: 'POST' });
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) {
        const data = await res.json() as { group: WhatsappGroup };
        setGroup(data.group);
      }
      await loadMembers();
      toast.success('Grupo sincronizado');
    } catch { toast.error('Erro ao sincronizar'); }
    finally { setSyncing(false); }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Erro ao enviar');
      }
      setMessageText('');
      await loadMessages();
      toast.success('Mensagem enviada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  if (loadingGroup) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Grupo não encontrado.</p>
        <Button variant="outline" onClick={() => router.push('/grupos')}>Voltar</Button>
      </div>
    );
  }

  const capacityPct = Math.round((group.currentSize / group.maxSize) * 100);
  const alerts = messages.filter((m) => m.aiAlert);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/grupos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
            <ArrowLeft className="h-3 w-3" />
            Grupos
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{group.name}</h1>
            <StatusDot status={group.status} />
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="shrink-0 gap-1.5"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          Sincronizar
        </Button>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-semibold">{group.currentSize.toLocaleString('pt-BR')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Membros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={cn('text-2xl font-semibold',
              capacityPct >= 90 ? 'text-red-600' : capacityPct >= 70 ? 'text-amber-600' : 'text-foreground'
            )}>{capacityPct}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Capacidade</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-semibold">{messages.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Mensagens</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={cn('text-2xl font-semibold', alerts.length > 0 ? 'text-red-600' : 'text-foreground')}>
              {alerts.length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Alertas IA</div>
          </CardContent>
        </Card>
      </div>

      {/* Segment + chip info */}
      <div className="flex flex-wrap gap-3 text-sm">
        {group.chipInstanceName && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
            <span className="text-muted-foreground">Chip:</span>
            <span className="font-medium">{group.chipInstanceName}</span>
          </div>
        )}
        {segment ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Segmento:</span>
            <span className="font-medium">{segment.name}</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{segment.audienceCount} eleitores</Badge>
          </div>
        ) : group.segmentTag ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <code className="text-xs font-mono">{group.segmentTag}</code>
          </div>
        ) : null}
        {group.inviteUrl && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs">
            <span className="text-muted-foreground truncate max-w-[220px]">{group.inviteUrl}</span>
            <button
              onClick={() => { void navigator.clipboard.writeText(group.inviteUrl!); toast.success('Copiado'); }}
              className="text-primary hover:underline text-xs"
            >Copiar</button>
          </div>
        )}
      </div>

      {/* Gemini alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {alerts.length} alerta(s) do Gemini
          </div>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <span className="shrink-0 text-muted-foreground">{new Date(m.createdAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>{m.aiAlert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Chat | Membros */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5" onClick={() => { if (participants.length === 0) void loadMembers(); }}>
            <Users className="h-3.5 w-3.5" />
            Membros
            {participants.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px] px-1 ml-1">{participants.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Chat ── */}
        <TabsContent value="chat" className="space-y-3">
          {/* Messages list */}
          <div className="rounded-xl border border-border bg-muted/20 h-[420px] overflow-y-auto p-4 space-y-3">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">As mensagens recebidas no grupo aparecerão aqui.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2 max-w-[85%]',
                    msg.fromMe ? 'ml-auto flex-row-reverse' : 'mr-auto',
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold',
                    msg.fromMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {msg.fromMe ? 'Eu' : (msg.senderName?.[0]?.toUpperCase() ?? '?')}
                  </div>

                  <div className="space-y-1">
                    <div className={cn(
                      'rounded-2xl px-3 py-2 text-sm',
                      msg.fromMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-background border border-border rounded-tl-sm',
                    )}>
                      {!msg.fromMe && msg.senderName && (
                        <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                    <div className={cn('flex items-center gap-2', msg.fromMe ? 'justify-end' : 'justify-start')}>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <SentimentBadge sentiment={msg.aiSentiment} />
                      {msg.aiAlert && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Alerta
                        </span>
                      )}
                      {msg.aiSuggestedTags && msg.aiSuggestedTags.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Tag className="h-2.5 w-2.5" />
                          {msg.aiSuggestedTags.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite uma mensagem para o grupo..."
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendMessage(); } }}
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              className="shrink-0 gap-1.5"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter para enviar • As mensagens são monitoradas pelo Gemini e tags são sugeridas automaticamente.
          </p>
        </TabsContent>

        {/* ── Membros ── */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros do grupo
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMembers}
                  disabled={loadingMembers}
                  className="gap-1.5"
                >
                  {loadingMembers ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando membros via WhatsApp...
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum membro carregado ainda.
                  </p>
                  <Button variant="outline" size="sm" onClick={loadMembers}>
                    Carregar membros
                  </Button>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-border">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                          {p.phone.slice(-2)}
                        </div>
                        <div>
                          <p className="text-sm font-mono">+{p.phone}</p>
                          <p className="text-xs text-muted-foreground">{p.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.admin === 'superadmin' && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <ShieldCheck className="h-3 w-3" />
                            Super Admin
                          </Badge>
                        )}
                        {p.admin === 'admin' && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Crown className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
