'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay } from '@/lib/phone';
import type { Chip, Conversation, ConversationMessage, Voter } from '@/db/schema';
import {
  appendUniqueMessage,
  buildConversationStreamCursor,
  upsertConversationList,
  useConversationStream,
} from '@/lib/use-conversation-stream';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  User,
  Bot,
  Zap,
  Plus,
  X,
  ArrowLeft,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string | null): string {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_DOT: Record<string, string> = {
  open:     'bg-red-500',
  assigned: 'bg-amber-500',
  waiting:  'bg-yellow-400',
  resolved: 'bg-green-500',
  bot:      'bg-blue-400',
};

const STATUS_LABEL: Record<string, string> = {
  open:     'Aberta',
  assigned: 'Atribuída',
  waiting:  'Aguardando',
  resolved: 'Resolvida',
  bot:      'Bot',
};

const STATUS_OPTS = ['open', 'assigned', 'waiting', 'resolved', 'bot'] as const;
type ConvStatus = typeof STATUS_OPTS[number];

const QUEUE_TABS = [
  { id: 'all',      label: 'Todas' },
  { id: 'open',     label: 'Abertas' },
  { id: 'assigned', label: 'Atribuídas' },
  { id: 'bot',      label: 'Bot' },
] as const;
type QueueTab = typeof QUEUE_TABS[number]['id'];

type VoterSearchResponse = {
  data: Voter[];
  total: number;
  page: number;
  limit: number;
};

type VoterContext = Pick<Voter, 'id' | 'name' | 'phone'>;

// ─── Queue Item ───────────────────────────────────────────────────────────────

function QueueItem({
  conv,
  selected,
  onClick,
}: {
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 rounded-lg border transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:bg-muted/50',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', STATUS_DOT[conv.status ?? 'bot'])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-medium text-foreground truncate">{conv.voterName}</span>
            <div className="flex items-center gap-1 shrink-0">
              {(conv.priority ?? 0) > 0 && <Zap className="h-3 w-3 text-amber-500" />}
              <span className="text-[10px] text-muted-foreground">{timeAgo(conv.lastMessageAt)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {formatPhoneDisplay(conv.voterPhone)}
            {conv.handoffReason ? ` · ${conv.handoffReason}` : ''}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ConversationMessage }) {
  const isAgent = msg.sender === 'agent';
  const isBot   = msg.sender === 'bot';
  return (
    <div className={cn('flex gap-2', isAgent ? 'justify-end' : 'justify-start')}>
      {!isAgent && (
        <div className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full shrink-0 mt-1',
          isBot ? 'bg-blue-500/20 text-blue-600' : 'bg-muted text-muted-foreground',
        )}>
          {isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </div>
      )}
      <div className={cn(
        'max-w-[75%] rounded-2xl px-3.5 py-2.5',
        isAgent
          ? 'rounded-tr-sm bg-primary text-primary-foreground'
          : isBot
            ? 'rounded-tl-sm bg-blue-500/10 text-blue-900 dark:text-blue-100'
            : 'rounded-tl-sm bg-muted text-foreground',
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={cn(
          'text-[10px] mt-1',
          isAgent ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground',
        )}>
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── New Conversation Dialog ──────────────────────────────────────────────────

function NewConvDialog({
  open,
  initialVoter,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialVoter?: VoterContext | null;
  onClose: () => void;
  onCreated: (conv: Conversation) => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const [voterId, setVoterId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<Voter[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const [chipsLoading, setChipsLoading] = useState(true);
  const [selectedChipId, setSelectedChipId] = useState('auto');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialVoter) return;
    setQuery(initialVoter.name);
    setVoterId(initialVoter.id);
    setName(initialVoter.name);
    setPhone(initialVoter.phone);
    setResults([]);
  }, [initialVoter]);

  useEffect(() => {
    let cancelled = false;

    const loadConnectedChips = async () => {
      setChipsLoading(true);
      try {
        const res = await fetch('/api/chips');
        if (!res.ok) {
          throw new Error('Erro ao carregar chips');
        }
        const allChips: Chip[] = await res.json();
        if (!cancelled) {
          setChips(allChips.filter((chip) => chip.status === 'connected'));
        }
      } catch {
        if (!cancelled) {
          setChips([]);
          toast.error('Erro ao carregar chips conectados');
        }
      } finally {
        if (!cancelled) {
          setChipsLoading(false);
        }
      }
    };

    loadConnectedChips();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/voters?search=${encodeURIComponent(term)}&limit=8`);
        if (!res.ok) {
          throw new Error('Erro ao buscar eleitores');
        }
        const payload: VoterSearchResponse = await res.json();
        if (!cancelled) {
          setResults(payload.data);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          toast.error('Erro ao buscar eleitores');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSelectVoter = (voter: Voter) => {
    setVoterId(voter.id);
    setQuery(voter.name);
    setName(voter.name);
    setPhone(voter.phone);
    setResults([]);
  };

  const handleCreate = async () => {
    if (!voterId || !name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      const payload = {
        voterId,
        chipId: selectedChipId !== 'auto' ? selectedChipId : null,
        voterName: name.trim(),
        voterPhone: phone.trim(),
        status: 'open',
        priority: 1,
      };
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const conv: Conversation = await res.json();
        toast.success('Conversa criada');
        await onCreated(conv);
        onClose();
      } else {
        toast.error('Erro ao criar conversa');
      }
    } catch {
      toast.error('Erro ao criar conversa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>Selecione um eleitor e chip para iniciar uma nova conversa</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Input
              placeholder="Buscar eleitor por nome ou telefone"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVoterId(null);
                setName('');
                setPhone('');
              }}
            />
            <div className="rounded-lg border border-border bg-muted/20">
              {isSearching ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Buscando eleitores...</p>
              ) : results.length > 0 ? (
                <div className="max-h-48 overflow-y-auto py-1">
                  {results.map((voter) => (
                    <button
                      key={voter.id}
                      type="button"
                      onClick={() => handleSelectVoter(voter)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{voter.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{formatPhoneDisplay(voter.phone)}</p>
                      </div>
                      <p className="max-w-[45%] text-[11px] text-muted-foreground text-right">
                        {voter.tags?.length ? voter.tags.join(', ') : 'Sem tags'}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {query.trim().length < 2
                    ? 'Digite ao menos 2 caracteres para buscar.'
                    : 'Nenhum eleitor encontrado.'}
                </p>
              )}
            </div>
          </div>
          <Input placeholder="Nome do eleitor" value={name} readOnly />
          <Input placeholder="Telefone" value={formatPhoneDisplay(phone)} readOnly />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Chip de saída
            </label>
            <Select value={selectedChipId} onValueChange={setSelectedChipId} disabled={chipsLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Auto (primeiro disponível)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (primeiro disponível)</SelectItem>
                {chips.map((chip) => (
                  <SelectItem key={chip.id} value={chip.id}>
                    {chip.name} · {formatPhoneDisplay(chip.phone)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {selectedChipId === 'auto'
                ? 'O envio usará o primeiro chip conectado disponível.'
                : 'As próximas respostas desta conversa usarão este chip salvo na conversa enquanto ele estiver conectado.'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !voterId || !name.trim() || !phone.trim()}>
            {saving ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const voterFilterId = searchParams.get('voterId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>('all');
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [handoffReason, setHandoffReason] = useState('');
  const [filteredVoter, setFilteredVoter] = useState<VoterContext | null>(null);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
  const [loadedMessagesForId, setLoadedMessagesForId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queueBootstrapRef = useRef<Conversation[]>([]);
  const messageBootstrapRef = useRef<ConversationMessage[]>([]);
  const [streamInitialCursor, setStreamInitialCursor] = useState<string | null>(null);

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;

  const refreshStreamCursorSeed = useCallback(() => {
    setStreamInitialCursor(
      buildConversationStreamCursor(queueBootstrapRef.current, messageBootstrapRef.current),
    );
  }, []);

  // ── Load conversations ──
  const loadConversations = useCallback(async (silent = false) => {
    try {
      const query = voterFilterId ? `?voterId=${encodeURIComponent(voterFilterId)}` : '';
      const res = await fetch(`/api/conversations${query}`);
      if (res.status === 401) { router.push('/login'); return; }
      if (res.ok) {
        const data: Conversation[] = await res.json();
        queueBootstrapRef.current = data;
        setConversations(data);
        refreshStreamCursorSeed();
      }
    } catch { /* silent */ }
    finally {
      if (!silent) {
        setHasLoadedConversations(true);
      }
    }
  }, [refreshStreamCursorSeed, router, voterFilterId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    setQueueTab('all');
  }, [voterFilterId]);

  useEffect(() => {
    if (!voterFilterId) {
      setFilteredVoter(null);
      return;
    }

    let cancelled = false;

    const loadFilteredVoter = async () => {
      try {
        const res = await fetch(`/api/voters?id=${encodeURIComponent(voterFilterId)}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) {
          if (!cancelled) setFilteredVoter(null);
          return;
        }

        const voter: Voter = await res.json();
        if (!cancelled) {
          setFilteredVoter({ id: voter.id, name: voter.name, phone: voter.phone });
        }
      } catch {
        if (!cancelled) {
          setFilteredVoter(null);
        }
      }
    };

    loadFilteredVoter();
    return () => {
      cancelled = true;
    };
  }, [router, voterFilterId]);

  // ── Load messages for selected conversation ──
  const loadMessages = useCallback(async () => {
    if (!selectedId) {
      messageBootstrapRef.current = [];
      setLoadedMessagesForId(null);
      refreshStreamCursorSeed();
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`);
      if (res.ok) {
        const data: ConversationMessage[] = await res.json();
        messageBootstrapRef.current = data;
        setMessages(data);
        setLoadedMessagesForId(selectedId);
        refreshStreamCursorSeed();
      }
    } catch { /* silent */ }
  }, [refreshStreamCursorSeed, selectedId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (selectedId) {
      messageBootstrapRef.current = [];
      setLoadedMessagesForId(null);
      refreshStreamCursorSeed();
      return;
    }

    messageBootstrapRef.current = [];
    setLoadedMessagesForId(null);
    refreshStreamCursorSeed();
  }, [refreshStreamCursorSeed, selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset handoffReason when selection changes
  useEffect(() => {
    setHandoffReason(selectedConv?.handoffReason ?? '');
  }, [selectedId, selectedConv?.handoffReason]);

  const streamEnabled = hasLoadedConversations && (!selectedId || loadedMessagesForId === selectedId);
  const { status: streamStatus, reconnectAttempts } = useConversationStream({
    enabled: streamEnabled,
    initialCursor: streamInitialCursor,
    voterId: voterFilterId ?? undefined,
    conversationId: selectedId ?? undefined,
    onConversationUpsert: (conversation) => {
      startTransition(() => {
        setConversations((prev) => upsertConversationList(prev, conversation));
      });
    },
    onMessageCreated: (message) => {
      if (message.conversationId !== selectedId) return;
      startTransition(() => {
        setMessages((prev) => appendUniqueMessage(prev, message));
      });
    },
  });

  // ── Filtered queue ──
  const filtered = conversations.filter(c => {
    if (queueTab === 'all') return true;
    return c.status === queueTab;
  });

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      if (messages.length > 0) {
        setMessages([]);
      }
      return;
    }

    const hasSelectedConversation = filtered.some((conversation) => conversation.id === selectedId);
    if (!hasSelectedConversation) {
      if (selectedId !== filtered[0].id) {
        setSelectedId(filtered[0].id);
      }
      if (messages.length > 0) {
        setMessages([]);
      }
    }
  }, [filtered, messages.length, selectedId]);

  // ── Send reply ──
  const handleSend = async () => {
    if (!selectedId || !reply.trim()) return;
    setIsSending(true);
    const content = reply.trim();
    setReply('');
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'agent', content }),
      });
      if (res.ok) {
        const msg: ConversationMessage = await res.json();
        setMessages(prev => [...prev, msg]);
      }
    } catch {
      toast.error('Erro ao enviar mensagem');
      setReply(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Update conversation status ──
  const updateStatus = async (status: ConvStatus) => {
    if (!selectedId) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, status, handoffReason: handoffReason || null }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => c.id === selectedId ? { ...c, status, handoffReason: handoffReason || null } : c)
        );
        toast.success(`Status atualizado: ${STATUS_LABEL[status]}`);
      }
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const activeFilterLabel = filteredVoter?.name ?? conversations[0]?.voterName ?? 'eleitor selecionado';

  return (
    <SidebarLayout currentPage="conversas" pageTitle="Conversas">
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ══ LEFT: Queue ══ */}
        <div className={cn('flex w-full lg:w-[300px] shrink-0 flex-col border-r border-border', mobileShowChat && 'hidden lg:flex')}>
          {/* Queue header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
            <h2 className="text-sm font-semibold text-foreground">Conversas</h2>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              {streamStatus === 'live'
                ? 'Tempo real ativo'
                : streamStatus === 'reconnecting'
                  ? `Reconectando tempo real (${reconnectAttempts})`
                  : streamStatus === 'offline'
                    ? 'Tempo real em fallback offline'
                    : 'Conectando stream...'}
            </p>
          </div>

          {voterFilterId && (
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="max-w-[220px] truncate">
                  Filtrado por: {activeFilterLabel}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => router.replace('/conversas')}
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpar
                </Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border px-2 py-1.5 gap-0.5">
            {QUEUE_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQueueTab(tab.id)}
                className={cn(
                  'flex-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors',
                  queueTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {tab.label}
                {tab.id !== 'all' && (
                  <span className="ml-1 text-[10px] opacity-70">
                    {conversations.filter(c => c.status === tab.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Queue list */}
          <ScrollArea className="flex-1 px-2 py-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {voterFilterId ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
                </p>
                {voterFilterId && filteredVoter && (
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={() => setShowNewDialog(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Iniciar conversa
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(conv => (
                  <QueueItem
                    key={conv.id}
                    conv={conv}
                    selected={selectedId === conv.id}
                    onClick={() => {
                      setSelectedId(conv.id);
                      setMessages([]);
                      setMobileShowChat(true);
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ══ CENTER: Chat ══ */}
        <div className={cn('flex flex-1 flex-col min-w-0', !mobileShowChat && 'hidden lg:flex')}>
          {!selectedConv ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
              <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Selecione uma conversa para começar</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_DOT[selectedConv.status ?? 'bot'])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedConv.voterName}</p>
                  <p className="text-xs text-muted-foreground">{formatPhoneDisplay(selectedConv.voterPhone)}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn('text-xs shrink-0', {
                    'bg-red-500/10 text-red-600 border-red-200': selectedConv.status === 'open',
                    'bg-amber-500/10 text-amber-600 border-amber-200': selectedConv.status === 'assigned',
                    'bg-blue-500/10 text-blue-600 border-blue-200': selectedConv.status === 'bot',
                    'bg-green-500/10 text-green-600 border-green-200': selectedConv.status === 'resolved',
                  })}
                >
                  {STATUS_LABEL[selectedConv.status ?? 'bot']}
                </Badge>
                {(selectedConv.status === 'bot' || selectedConv.status === 'open') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 shrink-0"
                    onClick={() => updateStatus('assigned')}
                  >
                    Assumir conversa
                  </Button>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex justify-center py-8 text-xs text-muted-foreground italic">
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply bar */}
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem... (Enter para enviar)"
                    rows={2}
                    disabled={selectedConv.status === 'resolved'}
                    className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={isSending || !reply.trim() || selectedConv.status === 'resolved'}
                    className="h-9 px-3 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {selectedConv.status === 'resolved' && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 text-center italic">
                    Conversa encerrada. Reabra para enviar mensagens.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ══ RIGHT: Voter context + handoff ══ */}
        <div className="hidden lg:flex w-[320px] shrink-0 flex-col border-l border-border">
          {!selectedConv ? (
            <div className="flex flex-1 items-center justify-center p-4 text-center">
              <p className="text-xs text-muted-foreground">Selecione uma conversa para ver o contexto</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">

                {/* Voter card */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Eleitor</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {selectedConv.voterName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{selectedConv.voterName}</p>
                        <p className="text-xs text-muted-foreground">{formatPhoneDisplay(selectedConv.voterPhone)}</p>
                      </div>
                    </div>
                    {selectedConv.assignedAgent && (
                      <p className="text-xs text-muted-foreground">Agente: {selectedConv.assignedAgent}</p>
                    )}
                  </div>
                </div>

                {/* Handoff controls */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Controles</p>
                  <div className="space-y-2">
                    <Select
                      value={selectedConv.status ?? 'bot'}
                      onValueChange={(v) => updateStatus(v as ConvStatus)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map(s => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="text"
                      placeholder="Motivo do handoff (opcional)"
                      value={handoffReason}
                      onChange={e => setHandoffReason(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => updateStatus('bot')}
                        disabled={selectedConv.status === 'bot'}
                      >
                        <Bot className="mr-1 h-3 w-3" />
                        Devolver bot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => updateStatus('resolved')}
                        disabled={selectedConv.status === 'resolved'}
                      >
                        Encerrar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</p>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map(p => (
                      <button
                        key={p}
                        type="button"
                        className={cn(
                          'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                          (selectedConv.priority ?? 0) === p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40',
                        )}
                        onClick={async () => {
                          await fetch('/api/conversations', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: selectedId, priority: p, status: selectedConv.status }),
                          });
                          setConversations(prev =>
                            prev.map(c => c.id === selectedId ? { ...c, priority: p } : c)
                          );
                        }}
                      >
                        {p === 0 ? 'Baixa' : p === 1 ? 'Media' : p === 2 ? 'Alta' : 'Crit'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* New conversation dialog */}
      <NewConvDialog
        open={showNewDialog}
        initialVoter={filteredVoter}
        onClose={() => setShowNewDialog(false)}
        onCreated={async (conv) => {
          await loadConversations();
          setMessages([]);
          setSelectedId(conv.id);
        }}
      />
    </SidebarLayout>
  );
}
