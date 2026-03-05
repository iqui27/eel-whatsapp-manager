'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Voter, Conversation, ConsentLog } from '@/db/schema';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Tag,
  X,
  Plus,
  MessageSquare,
  Shield,
  CheckSquare,
  Square,
  Save,
} from 'lucide-react';

// ─── Opt-in helpers ───────────────────────────────────────────────────────────

const OPT_IN_LABELS: Record<string, string> = {
  active: 'Opt-in ativo', pending: 'Pendente', expired: 'Expirado', revoked: 'Revogado',
};
const OPT_IN_CLASSES: Record<string, string> = {
  active:  'bg-green-500/10 text-green-600 border-green-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  expired: 'bg-muted text-muted-foreground border-border',
  revoked: 'bg-red-500/10 text-red-600 border-red-200',
};

const CONSENT_ACTION_LABELS: Record<string, string> = {
  opt_in: 'Opt-in registrado', opt_out: 'Opt-out', renew: 'Renovação', revoke: 'Revogado',
};

// ─── Engagement indicator ─────────────────────────────────────────────────────

function EngagementIndicator({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 60 ? '#22c55e' : s >= 30 ? '#f59e0b' : '#ef4444';
  const label = s >= 60 ? 'Quente' : s >= 30 ? 'Morno' : 'Frio';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center z-10">
          <div className="text-2xl font-bold text-foreground tabular-nums">{s}</div>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Timeline entry ───────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: 'conversation'; data: Conversation }
  | { kind: 'consent';      data: ConsentLog };

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === 'conversation') {
    const c = entry.data;
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Conversa WhatsApp</p>
            <span className="text-xs text-muted-foreground shrink-0">
              {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Status: {c.status} {c.handoffReason ? `· ${c.handoffReason}` : ''}
          </p>
        </div>
      </div>
    );
  }
  const cl = entry.data;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
        <Shield className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
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

// ─── Checklist items ──────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  'Visita presencial realizada',
  'Evento de campanha confirmado',
  'Doação recebida',
  'Resposta de campanha recebida',
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VoterProfilePage() {
  const params = useParams<{ id: string }>();
  const voterId = params.id;

  const [voter, setVoter] = useState<Voter | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tags editing
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  // Checklist (localStorage)
  const checklistKey = `eel_checklist_${voterId}`;
  const notesKey = `eel_notes_${voterId}`;
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const [vRes, cRes, clRes] = await Promise.all([
        fetch(`/api/voters?search=${voterId}`),
        fetch(`/api/conversations?voterId=${voterId}`),
        fetch(`/api/compliance?voterId=${voterId}`),
      ]);
      // Voter: search by id won't work directly; use GET all and find
      // Use the existing GET route which returns all voters, then find by id
      const voterAll: Voter[] = vRes.ok ? await vRes.json() : [];
      const found = voterAll.find(v => v.id === voterId);
      if (found) {
        setVoter(found);
        setTags(found.tags ?? []);
      }
      if (cRes.ok) setConversations(await cRes.json());
      if (clRes.ok) setConsentLogs(await clRes.json());
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [voterId]);

  useEffect(() => { load(); }, [load]);

  // Load checklist + notes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(checklistKey);
      if (stored) setChecklist(JSON.parse(stored));
      const storedNotes = localStorage.getItem(notesKey);
      if (storedNotes) setNotes(storedNotes);
    } catch { /* silent */ }
  }, [checklistKey, notesKey]);

  const toggleCheck = (i: number) => {
    const next = checklist.map((v, idx) => idx === i ? !v : v);
    setChecklist(next);
    try { localStorage.setItem(checklistKey, JSON.stringify(next)); } catch { /* silent */ }
  };

  const saveNotes = () => {
    try {
      localStorage.setItem(notesKey, notes);
      toast.success('Notas salvas');
    } catch {
      toast.error('Erro ao salvar notas');
    }
  };

  const saveTags = async () => {
    if (!voter) return;
    setSavingTags(true);
    try {
      const res = await fetch('/api/voters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voter.id, tags }),
      });
      if (res.ok) toast.success('Tags salvas');
      else toast.error('Erro ao salvar tags');
    } catch {
      toast.error('Erro ao salvar tags');
    } finally {
      setSavingTags(false);
    }
  };

  const addTag = () => {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t || tags.includes(t)) return;
    setTags(prev => [...prev, t]);
    setNewTag('');
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  // Build timeline
  const timeline: TimelineEntry[] = [
    ...conversations.map(c => ({ kind: 'conversation' as const, data: c })),
    ...consentLogs.map(cl => ({ kind: 'consent' as const, data: cl })),
  ].sort((a, b) => {
    const dateA = a.kind === 'conversation' ? a.data.lastMessageAt : a.data.createdAt;
    const dateB = b.kind === 'conversation' ? b.data.lastMessageAt : b.data.createdAt;
    return new Date(dateB ?? 0).getTime() - new Date(dateA ?? 0).getTime();
  });

  if (isLoading) {
    return (
      <SidebarLayout currentPage="crm" pageTitle="Perfil do Eleitor">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Carregando...</div>
      </SidebarLayout>
    );
  }

  if (!voter) {
    return (
      <SidebarLayout currentPage="crm" pageTitle="Perfil do Eleitor">
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

        {/* Back */}
        <Link href="/crm">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4" />
            CRM Eleitoral
          </Button>
        </Link>

        {/* ── Header card ── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6 flex-wrap">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
                {voter.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{voter.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {voter.phone}
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

                {/* Opt-in */}
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', OPT_IN_CLASSES[voter.optInStatus ?? 'pending'])}>
                    {OPT_IN_LABELS[voter.optInStatus ?? 'pending']}
                  </span>
                  {voter.optInDate && (
                    <span className="text-xs text-muted-foreground">
                      desde {new Date(voter.optInDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{voter.contactCount ?? 0} contatos</span>
                </div>
              </div>

              {/* Engagement */}
              <EngagementIndicator score={voter.engagementScore} />
            </div>
          </CardContent>
        </Card>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

          {/* Left: Tags + Timeline */}
          <div className="space-y-6">

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4 text-primary" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                  {tags.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Nenhuma tag. Adicione abaixo.</span>
                  )}
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {showTagInput ? (
                    <>
                      <Input
                        placeholder="nome-da-tag"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setShowTagInput(false); }}
                        className="h-7 text-xs max-w-[180px]"
                        autoFocus
                      />
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addTag}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTagInput(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowTagInput(true)}>
                      <Plus className="h-3 w-3" />
                      Adicionar tag
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs ml-auto"
                    onClick={saveTags}
                    disabled={savingTags}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    {savingTags ? 'Salvando...' : 'Salvar tags'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Timeline de interações
                  <Badge variant="secondary" className="ml-auto text-xs">{timeline.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Sem interações registradas</p>
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
          </div>

          {/* Right: Checklist + Notes */}
          <div className="space-y-4">

            {/* Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {CHECKLIST_ITEMS.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleCheck(i)}
                    className="flex items-center gap-2.5 w-full text-left rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    {checklist[i]
                      ? <CheckSquare className="h-4 w-4 text-green-600 shrink-0" />
                      : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={cn('text-sm', checklist[i] ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {item}
                    </span>
                  </button>
                ))}
                <p className="text-xs text-muted-foreground pt-1 italic">
                  Salvo localmente neste dispositivo
                </p>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Próximas ações / Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anote próximos passos, observações ou lembretes sobre este eleitor..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" onClick={saveNotes} className="w-full gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Salvar notas
                </Button>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/conversas">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <MessageSquare className="h-4 w-4" />
                    Ver conversas
                  </Button>
                </Link>
                <Link href="/campanhas/nova">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <User className="h-4 w-4" />
                    Criar campanha personalizada
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
