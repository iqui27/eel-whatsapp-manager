'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay } from '@/lib/phone';
import type { Voter, Conversation, ConsentLog } from '@/db/schema';

type VoterWithSegments = Voter & { segments?: Array<{ id: string; name: string }> };

interface SegmentOption { id: string; name: string; audienceCount: number; }

import {
  ArrowLeft, Phone, MapPin, Tag, X, Plus, MessageSquare,
  Shield, CheckSquare, Square, Save, Sparkles, Layers,
  Pencil, Building2, CalendarDays, Home, FileText,
  Loader2, RefreshCw, User, Briefcase,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPT_IN_LABELS: Record<string, string> = {
  active: 'Ativo', pending: 'Pendente', expired: 'Expirado', revoked: 'Revogado',
};
const OPT_IN_CLASSES: Record<string, string> = {
  active:  'bg-green-500/10 text-green-600 border-green-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  expired: 'bg-muted text-muted-foreground border-border',
  revoked: 'bg-red-500/10 text-red-600 border-red-200',
};
const AI_TIER_LABELS: Record<string, string> = {
  hot: 'Quente', warm: 'Morno', cold: 'Frio', dead: 'Inativo',
};
const AI_TIER_COLORS: Record<string, string> = {
  hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6', dead: '#94a3b8',
};
const AI_SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo', neutral: 'Neutro', negative: 'Negativo',
};
const AI_SENTIMENT_CLASSES: Record<string, string> = {
  positive: 'bg-green-500/10 text-green-600 border-green-200',
  neutral:  'bg-muted text-muted-foreground border-border',
  negative: 'bg-red-500/10 text-red-600 border-red-200',
};
const CONSENT_ACTION_LABELS: Record<string, string> = {
  opt_in: 'Opt-in registrado', opt_out: 'Opt-out', renew: 'Renovação', revoke: 'Revogado',
};

// ─── Engagement Circle ────────────────────────────────────────────────────────

function EngagementCircle({ score, tier }: { score: number | null; tier?: string | null }) {
  const s = score ?? 0;
  const color = AI_TIER_COLORS[tier ?? ''] ?? (s >= 60 ? '#22c55e' : s >= 30 ? '#f59e0b' : '#ef4444');
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="text-center z-10">
          <div className="text-xl font-bold tabular-nums" style={{ color }}>{s}</div>
        </div>
      </div>
      {tier && (
        <span className="text-xs font-medium" style={{ color }}>
          {AI_TIER_LABELS[tier] ?? tier}
        </span>
      )}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className="text-xs text-foreground font-medium">{value}</span>
      </div>
    </div>
  );
}

// ─── Checklist ────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { key: 'contato_realizado',        label: 'Contato inicial realizado' },
  { key: 'interesse_confirmado',     label: 'Interesse confirmado' },
  { key: 'convite_evento_enviado',   label: 'Convite para evento enviado' },
  { key: 'participou_evento',        label: 'Participou de evento' },
  { key: 'apoiador_confirmado',      label: 'Apoiador confirmado' },
  { key: 'indicou_novos_contatos',   label: 'Indicou novos contatos' },
];

// ─── Timeline ─────────────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: 'conversation'; data: Conversation }
  | { kind: 'consent';      data: ConsentLog };

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === 'conversation') {
    const c = entry.data;
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Conversa WhatsApp</p>
            <span className="text-xs text-muted-foreground shrink-0">
              {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {c.status === 'resolved' ? 'Resolvida' : c.status === 'open' ? 'Aberta' : c.status}
            {c.handoffReason ? ` · ${c.handoffReason}` : ''}
          </p>
        </div>
      </div>
    );
  }
  const cl = entry.data;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 mt-0.5">
        <Shield className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{CONSENT_ACTION_LABELS[cl.action] ?? cl.action}</p>
          <span className="text-xs text-muted-foreground shrink-0">
            {cl.createdAt ? new Date(cl.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Canal: {cl.channel ?? 'whatsapp'}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VoterProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const voterId = params.id;

  const [voter, setVoter] = useState<VoterWithSegments | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([]);
  const [allSegments, setAllSegments] = useState<SegmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit mode for main info
  const [editingInfo, setEditingInfo] = useState(false);
  const [editInfo, setEditInfo] = useState<Partial<Voter>>({});
  const [savingInfo, setSavingInfo] = useState(false);

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  // Segments
  const [addingSegment, setAddingSegment] = useState(false);
  const [selectedNewSegment, setSelectedNewSegment] = useState('');
  const [savingSegment, setSavingSegment] = useState(false);

  // Checklist + notes
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [savingContext, setSavingContext] = useState(false);

  // Gemini analysis
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const [voterRes, segmentsRes] = await Promise.all([
        fetch(`/api/voters?id=${voterId}`),
        fetch('/api/segments'),
      ]);
      if (voterRes.status === 401) { router.push('/login'); return; }
      if (voterRes.status === 404) { setNotFound(true); setIsLoading(false); return; }
      if (!voterRes.ok) throw new Error();

      const voterData: VoterWithSegments = await voterRes.json();
      setVoter(voterData);
      setTags(voterData.tags ?? []);
      setNotes(voterData.crmNotes ?? '');

      // Build checklist from stored crmChecklist array
      const stored = voterData.crmChecklist ?? [];
      setChecklist(Object.fromEntries(CHECKLIST_ITEMS.map(it => [it.key, stored.includes(it.key)])));

      if (segmentsRes.ok) {
        const segs: SegmentOption[] = await segmentsRes.json();
        setAllSegments(Array.isArray(segs) ? segs : []);
      }

      const [cRes, clRes] = await Promise.all([
        fetch(`/api/conversations?voterId=${voterId}`),
        fetch(`/api/compliance?voterId=${voterId}`),
      ]);
      if (cRes.ok) setConversations(await cRes.json());
      if (clRes.ok) setConsentLogs(await clRes.json());
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [router, voterId]);

  useEffect(() => { load(); }, [load]);

  // ── Save main info ──
  const saveInfo = async () => {
    if (!voter) return;
    setSavingInfo(true);
    try {
      const res = await fetch('/api/voters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voter.id, ...editInfo }),
      });
      if (res.ok) {
        const updated: VoterWithSegments = await res.json();
        setVoter(updated);
        setEditingInfo(false);
        toast.success('Dados salvos');
      } else { toast.error('Erro ao salvar'); }
    } catch { toast.error('Erro ao salvar'); }
    finally { setSavingInfo(false); }
  };

  // ── Save tags ──
  const saveTags = async () => {
    if (!voter) return;
    setSavingTags(true);
    try {
      const res = await fetch('/api/voters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voter.id, tags }),
      });
      if (res.ok) { setVoter(await res.json()); toast.success('Tags salvas'); }
      else { toast.error('Erro ao salvar tags'); }
    } catch { toast.error('Erro ao salvar tags'); }
    finally { setSavingTags(false); }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!t || tags.includes(t)) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  // ── Add to segment ──
  const addToSegment = async () => {
    if (!voter || !selectedNewSegment) return;
    setSavingSegment(true);
    try {
      const res = await fetch('/api/segments?action=add-voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: selectedNewSegment, voterIds: [voter.id] }),
      });
      if (res.ok) {
        toast.success('Adicionado ao segmento');
        setAddingSegment(false);
        setSelectedNewSegment('');
        await load(); // reload to get updated segments
      } else { toast.error('Erro ao adicionar ao segmento'); }
    } catch { toast.error('Erro ao adicionar ao segmento'); }
    finally { setSavingSegment(false); }
  };

  // ── Save checklist + notes ──
  const saveContext = async (nextChecklist = checklist, nextNotes = notes, msg?: string) => {
    if (!voter) return;
    setSavingContext(true);
    try {
      const crmChecklist = CHECKLIST_ITEMS.filter(it => nextChecklist[it.key]).map(it => it.key);
      const res = await fetch('/api/voters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voter.id, crmChecklist, crmNotes: nextNotes.trim() || null }),
      });
      if (res.ok) {
        const updated: VoterWithSegments = await res.json();
        setVoter(updated);
        if (msg) toast.success(msg);
      } else { toast.error('Erro ao salvar'); }
    } catch { toast.error('Erro ao salvar'); }
    finally { setSavingContext(false); }
  };

  const toggleCheck = async (key: string) => {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    await saveContext(next, notes, 'Checklist atualizado');
  };

  // ── Gemini Analysis ──
  const runAnalysis = async () => {
    if (!voter) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/voters/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voter.id }),
      });
      if (res.ok) {
        const data = await res.json() as { voter?: VoterWithSegments };
        if (data.voter) {
          setVoter(prev => prev ? { ...prev, ...data.voter } : data.voter ?? prev);
        }
        toast.success('Análise do Gemini concluída');
      } else {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        toast.error(err?.error ?? 'Erro na análise');
      }
    } catch { toast.error('Erro na análise'); }
    finally { setAnalyzing(false); }
  };

  // ── Timeline ──
  const timeline: TimelineEntry[] = [
    ...conversations.map(c => ({ kind: 'conversation' as const, data: c })),
    ...consentLogs.map(cl => ({ kind: 'consent' as const, data: cl })),
  ].sort((a, b) => {
    const da = a.kind === 'conversation' ? a.data.lastMessageAt : a.data.createdAt;
    const db = b.kind === 'conversation' ? b.data.lastMessageAt : b.data.createdAt;
    return new Date(db ?? 0).getTime() - new Date(da ?? 0).getTime();
  });

  const voterSegmentIds = new Set((voter?.segments ?? []).map(s => s.id));
  const availableSegments = allSegments.filter(s => !voterSegmentIds.has(s.id));
  const doneCount = CHECKLIST_ITEMS.filter(it => checklist[it.key]).length;

  if (isLoading) {
    return (
      <SidebarLayout currentPage="crm" pageTitle="Perfil">
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      </SidebarLayout>
    );
  }

  if (notFound || !voter) {
    return (
      <SidebarLayout currentPage="crm" pageTitle="Perfil">
        <div className="p-6 text-center text-muted-foreground">
          Eleitor não encontrado.{' '}
          <Link href="/crm" className="text-primary underline">Voltar ao CRM</Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="crm" pageTitle={voter.name}>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <Link href="/crm">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4" />
            CRM Eleitoral
          </Button>
        </Link>

        {/* ── Header ── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-5 flex-wrap">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold uppercase">
                {voter.name.charAt(0)}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0 space-y-2">
                {editingInfo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Nome</label>
                      <Input value={editInfo.name ?? voter.name} onChange={e => setEditInfo(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Telefone</label>
                      <Input value={editInfo.phone ?? voter.phone} onChange={e => setEditInfo(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Opt-in</label>
                      <Select value={editInfo.optInStatus ?? voter.optInStatus ?? 'pending'}
                        onValueChange={v => setEditInfo(p => ({ ...p, optInStatus: v as Voter['optInStatus'] }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="expired">Expirado</SelectItem>
                          <SelectItem value="revoked">Revogado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Zona</label>
                      <Input value={editInfo.zone ?? voter.zone ?? ''} onChange={e => setEditInfo(p => ({ ...p, zone: e.target.value }))} placeholder="123" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Seção</label>
                      <Input value={editInfo.section ?? voter.section ?? ''} onChange={e => setEditInfo(p => ({ ...p, section: e.target.value }))} placeholder="456" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Cidade</label>
                      <Input value={editInfo.city ?? voter.city ?? ''} onChange={e => setEditInfo(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Bairro</label>
                      <Input value={editInfo.neighborhood ?? voter.neighborhood ?? ''} onChange={e => setEditInfo(p => ({ ...p, neighborhood: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Endereço</label>
                      <Input value={editInfo.address ?? voter.address ?? ''} onChange={e => setEditInfo(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">CEP</label>
                      <Input value={editInfo.cep ?? voter.cep ?? ''} onChange={e => setEditInfo(p => ({ ...p, cep: e.target.value }))} placeholder="00000-000" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">CPF</label>
                      <Input value={editInfo.cpf ?? voter.cpf ?? ''} onChange={e => setEditInfo(p => ({ ...p, cpf: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2 flex gap-2 justify-end pt-1">
                      <Button variant="outline" size="sm" onClick={() => setEditingInfo(false)}>Cancelar</Button>
                      <Button size="sm" onClick={saveInfo} disabled={savingInfo}>
                        {savingInfo ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h1 className="text-2xl font-semibold text-foreground">{voter.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {formatPhoneDisplay(voter.phone)}
                          </span>
                          {voter.zone && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              Zona {voter.zone}{voter.section ? ` · Seção ${voter.section}` : ''}
                            </span>
                          )}
                          {voter.city && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {voter.city}{voter.neighborhood ? ` · ${voter.neighborhood}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 shrink-0"
                        onClick={() => { setEditingInfo(true); setEditInfo({}); }}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', OPT_IN_CLASSES[voter.optInStatus ?? 'pending'])}>
                        {OPT_IN_LABELS[voter.optInStatus ?? 'pending']}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{voter.contactCount ?? 0} contatos</span>
                      {voter.lastContacted && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            Último contato: {new Date(voter.lastContacted).toLocaleDateString('pt-BR')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Extra fields row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-0.5 pt-1">
                      <InfoRow icon={Home}       label="Endereço"      value={voter.address} />
                      <InfoRow icon={MapPin}     label="CEP"           value={voter.cep} />
                      <InfoRow icon={Briefcase}  label="Projeto"       value={voter.projectName} />
                      <InfoRow icon={Building2}  label="Subsecretaria" value={voter.subsecretaria} />
                      <InfoRow icon={CalendarDays} label="Evento"      value={voter.eventDate} />
                      <InfoRow icon={MapPin}     label="Local"         value={voter.eventLocation} />
                    </div>
                  </>
                )}
              </div>

              {/* Engagement */}
              <EngagementCircle score={voter.engagementScore} tier={voter.aiTier} />
            </div>
          </CardContent>
        </Card>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4 text-primary" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border border-input bg-background px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                  onClick={() => document.getElementById('profile-tag-input')?.focus()}
                >
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {tag}
                      <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="profile-tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
                      if (e.key === 'Backspace' && !tagInput && tags.length) setTags(prev => prev.slice(0, -1));
                    }}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? 'Adicionar tag...' : ''}
                    className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button size="sm" onClick={saveTags} disabled={savingTags} className="gap-1.5">
                  {savingTags ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar tags
                </Button>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Histórico de interações
                  <Badge variant="secondary" className="ml-auto text-xs">{timeline.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Sem interações registradas</p>
                    <Link href={`/conversas?voterId=${voter.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Iniciar conversa
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((entry, i) => (
                      <div key={i}>
                        {i > 0 && <Separator className="mb-4" />}
                        <TimelineRow entry={entry} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Notas e próximos passos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anote observações, lembretes ou próximos passos..."
                  rows={4}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" onClick={() => saveContext(checklist, notes, 'Notas salvas')} disabled={savingContext} className="gap-1.5">
                  {savingContext ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar notas
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Gemini Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Análise Gemini
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    onClick={runAnalysis}
                    disabled={analyzing}
                  >
                    {analyzing
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Analisando...</>
                      : <><RefreshCw className="h-3 w-3" /> {voter.aiTier ? 'Re-analisar' : 'Analisar'}</>
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!voter.aiTier && !voter.aiSentiment && !voter.aiAnalysisSummary ? (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Não analisado ainda.</p>
                    <Button size="sm" onClick={runAnalysis} disabled={analyzing} className="gap-1.5">
                      {analyzing
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analisando...</>
                        : <><Sparkles className="h-3.5 w-3.5" />Analisar com Gemini</>
                      }
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {voter.aiTier && (
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          voter.aiTier === 'hot' ? 'bg-red-500/10 text-red-600 border-red-200' :
                          voter.aiTier === 'warm' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                          voter.aiTier === 'cold' ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                          'bg-muted text-muted-foreground border-border'
                        )}>
                          {AI_TIER_LABELS[voter.aiTier]}
                        </span>
                      )}
                      {voter.aiSentiment && (
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', AI_SENTIMENT_CLASSES[voter.aiSentiment])}>
                          {AI_SENTIMENT_LABELS[voter.aiSentiment]}
                        </span>
                      )}
                    </div>
                    {voter.aiAnalysisSummary && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{voter.aiAnalysisSummary}</p>
                    )}
                    {voter.aiRecommendedAction && (
                      <p className="text-xs">
                        <span className="font-medium text-foreground">Ação: </span>
                        <span className="text-muted-foreground">{voter.aiRecommendedAction}</span>
                      </p>
                    )}
                    {voter.aiLastAnalyzed && (
                      <p className="text-[10px] text-muted-foreground">
                        Analisado em {new Date(voter.aiLastAnalyzed).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Segmentos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  Segmentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(voter.segments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum segmento</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(voter.segments ?? []).map(seg => (
                      <Link key={seg.id} href="/segmentacao">
                        <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer transition-colors">
                          {seg.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {addingSegment ? (
                  <div className="space-y-2">
                    <Select value={selectedNewSegment} onValueChange={setSelectedNewSegment}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar segmento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSegments.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                        onClick={() => { setAddingSegment(false); setSelectedNewSegment(''); }}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-7 text-xs flex-1"
                        onClick={addToSegment} disabled={!selectedNewSegment || savingSegment}>
                        {savingSegment ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Adicionar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full"
                    onClick={() => setAddingSegment(true)}
                    disabled={availableSegments.length === 0}>
                    <Plus className="h-3 w-3" />
                    {availableSegments.length === 0 ? 'Em todos os segmentos' : 'Adicionar a segmento'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Checklist
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {doneCount}/{CHECKLIST_ITEMS.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {CHECKLIST_ITEMS.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleCheck(item.key)}
                    disabled={savingContext}
                    className="flex items-center gap-2.5 w-full text-left rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    {checklist[item.key]
                      ? <CheckSquare className="h-4 w-4 text-green-600 shrink-0" />
                      : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={cn('text-sm', checklist[item.key] ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Ações rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/conversas?voterId=${voter.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <MessageSquare className="h-4 w-4" /> Ver conversas
                  </Button>
                </Link>
                <Link href={`/campanhas/nova?voterId=${voter.id}&voterName=${encodeURIComponent(voter.name)}&source=crm`}>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <Sparkles className="h-4 w-4" /> Criar campanha personalizada
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start"
                  onClick={runAnalysis} disabled={analyzing}>
                  {analyzing
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Analisando...</>
                    : <><RefreshCw className="h-4 w-4" />Analisar com Gemini</>
                  }
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
