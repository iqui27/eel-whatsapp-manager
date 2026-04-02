'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/use-swr';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Megaphone, Pencil, Trash2, BarChart3, Copy, Search, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign, Segment } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChipInfo {
  id: string;
  name: string;
  profileName: string | null;
  profilePictureUrl: string | null;
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  sending: 'Enviando',
  sent: 'Concluído',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  sending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent: 'bg-green-500/10 text-green-600 border-green-200',
  paused: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'draft';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_CLASSES[s] ?? STATUS_CLASSES.draft)}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

// ─── Segment chip ─────────────────────────────────────────────────────────────

function SegmentChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
      {name}
    </span>
  );
}

// ─── Chip avatars ─────────────────────────────────────────────────────────────

function ChipAvatar({ chip }: { chip: ChipInfo }) {
  const initials = (chip.profileName ?? chip.name).slice(0, 2).toUpperCase();
  return (
    <div
      className="relative h-6 w-6 shrink-0 rounded-full border border-border bg-muted overflow-hidden"
      title={chip.profileName ?? chip.name}
    >
      {chip.profilePictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chip.profilePictureUrl}
          alt={chip.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-muted-foreground">
          {initials}
        </span>
      )}
    </div>
  );
}

function ChipPills({ chipIds, allChips }: { chipIds: string[]; allChips: ChipInfo[] }) {
  const matched = chipIds
    .map(id => allChips.find(c => c.id === id))
    .filter((c): c is ChipInfo => !!c);

  if (matched.length === 0) {
    return <span className="text-muted-foreground/50 text-xs">—</span>;
  }

  const visible = matched.slice(0, 2);
  const overflow = matched.length - 2;

  return (
    <div className="flex items-center gap-1">
      {visible.map(chip => (
        <ChipAvatar key={chip.id} chip={chip} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ─── Date range display ───────────────────────────────────────────────────────

function DateRangeCell({ campaign }: { campaign: Campaign }) {
  const fmt = (d: Date | string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (campaign.startDate && campaign.endDate) {
    return (
      <span className="text-xs text-muted-foreground">
        {fmt(campaign.startDate)} — {fmt(campaign.endDate)}
      </span>
    );
  }
  if (campaign.scheduledAt) {
    return (
      <span className="text-xs text-muted-foreground">
        {new Date(campaign.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }
  return <span className="text-muted-foreground/40 text-xs">—</span>;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressCell({ campaign }: { campaign: Campaign }) {
  const showProgress = campaign.status === 'sending' || campaign.status === 'sent';
  if (!showProgress) return null;

  const sent = campaign.totalSent ?? 0;
  const total = sent + (campaign.totalFailed ?? 0);
  if (total === 0) return null;

  const pct = Math.min(100, Math.round((sent / total) * 100));

  return (
    <div className="space-y-0.5 min-w-[80px]">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', campaign.status === 'sent' ? 'bg-green-500' : 'bg-amber-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{pct}%</p>
    </div>
  );
}

// ─── Activate / Pause button ──────────────────────────────────────────────────

interface ActionButtonProps {
  campaign: Campaign;
  onActivate: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  loading: boolean;
}

function ActivatePauseButton({ campaign, onActivate, onPause, onResume, loading }: ActionButtonProps) {
  if (campaign.status === 'draft') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        title="Ativar campanha"
        disabled={loading}
        onClick={() => onActivate(campaign.id)}
      >
        <Play className="h-3.5 w-3.5" />
      </Button>
    );
  }
  if (campaign.status === 'scheduled' || campaign.status === 'sending') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
        title="Pausar campanha"
        disabled={loading}
        onClick={() => onPause(campaign.id)}
      >
        <Pause className="h-3.5 w-3.5" />
      </Button>
    );
  }
  if (campaign.status === 'paused') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        title="Retomar campanha"
        disabled={loading}
        onClick={() => onResume(campaign.id)}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    );
  }
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

export default function CampanhasPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pauseId, setPauseId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showGuide, setShowGuide] = useState(false);

  // SWR-based data fetching
  const { data: campaigns = [], mutate: mutateCampaigns, isLoading: campaignsLoading } = useSWR<Campaign[]>('/api/campaigns', fetcher);
  const { data: segments = [] } = useSWR<Segment[]>('/api/segments', fetcher);
  const { data: chipsData = [] } = useSWR<ChipInfo[]>('/api/chips', fetcher);

  // Derived chips data
  const allChips = useMemo(() => chipsData.map(c => ({
    id: c.id,
    name: c.name,
    profileName: c.profileName ?? null,
    profilePictureUrl: c.profilePictureUrl ?? null,
  })), [chipsData]);

  const isLoading = campaignsLoading;

  useEffect(() => {
    setShowGuide(!localStorage.getItem('campanhas-guide-dismissed'));
  }, []);

  const refreshData = useCallback(async () => {
    await mutateCampaigns();
  }, [mutateCampaigns]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/campaigns?id=${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Campanha removida');
        mutateCampaigns(campaigns.filter(c => c.id !== deleteId), false);
      } else {
        toast.error('Erro ao remover campanha');
      }
    } catch {
      toast.error('Erro ao remover campanha');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} (cópia)`,
          template: campaign.template,
          status: 'draft',
          segmentId: campaign.segmentId,
        }),
      });
      if (res.ok) {
        toast.success('Campanha duplicada');
        mutateCampaigns();
      }
    } catch {
      toast.error('Erro ao duplicar campanha');
    }
  };

  // ─── Status transition helpers ─────────────────────────────────────────────

  const updateStatus = async (id: string, newStatus: string) => {
    const prev = campaigns.find(c => c.id === id);
    if (!prev) return;

    // Optimistic update
    mutateCampaigns(campaigns.map(c => c.id === id ? { ...c, status: newStatus as Campaign['status'] } : c), false);
    setActionLoading(id);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Erro ao atualizar status');
      }
      const updated = await res.json();
      mutateCampaigns(campaigns.map(c => c.id === id ? updated : c), false);
      toast.success(`Campanha ${newStatus === 'scheduled' ? 'ativada' : newStatus === 'paused' ? 'pausada' : 'retomada'}`);
    } catch (err) {
      // Rollback
      mutateCampaigns(campaigns.map(c => c.id === id ? prev : c), false);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = (id: string) => updateStatus(id, 'scheduled');

  const handlePause = async () => {
    if (!pauseId) return;
    setPauseId(null);
    await updateStatus(pauseId, 'paused');
  };

  const handleResume = async (id: string) => {
    // Resume: go back to scheduled (safest, cron will pick it up)
    await updateStatus(id, 'scheduled');
  };

  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [campaigns, searchQuery, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE));
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const segmentMap = new Map(segments.map((s) => [s.id, s]));

  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Campanhas">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Campanhas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie e gerencie campanhas de mensagens para seus segmentos
            </p>
          </div>
          <Link href="/campanhas/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova campanha
            </Button>
          </Link>
        </div>

        {/* Onboarding guide */}
        {showGuide && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Como funcionam as campanhas</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowGuide(false); localStorage.setItem('campanhas-guide-dismissed', '1'); }}>
                Fechar guia
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { step: '1', title: 'Crie um segmento', desc: 'Defina o público-alvo com filtros' },
                { step: '2', title: 'Escreva a mensagem', desc: 'Use variáveis como {nome} e {bairro}' },
                { step: '3', title: 'Agende o envio', desc: 'Escolha horário e chip de envio' },
                { step: '4', title: 'Acompanhe', desc: 'Monitor de entrega em tempo real' },
              ].map(item => (
                <div key={item.step} className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">{item.step}</span>
                  <p className="text-xs font-medium">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + filters */}
        {!isLoading && campaigns.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder="Buscar campanha por nome..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="sending">Enviando</SelectItem>
                  <SelectItem value="sent">Concluído</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'oldest')}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mais recente</SelectItem>
                  <SelectItem value="oldest">Mais antigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Carregando campanhas...
          </div>
        ) : campaigns.length === 0 ? (
          /* Empty state — no campaigns at all */
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">Crie sua primeira campanha</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Campanhas permitem enviar mensagens personalizadas para segmentos de eleitores.
              </p>
            </div>
            <Link href="/campanhas/nova">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Nova Campanha
              </Button>
            </Link>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          /* No results for filters */
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <Search className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada para este filtro.</p>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          /* Campaigns table */
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 border-b border-border">
                  <TableHead className="w-[220px]">Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Chips</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCampaigns.map(campaign => {
                  const segment = campaign.segmentId ? segmentMap.get(campaign.segmentId) : undefined;
                  const chipIds = Array.isArray(campaign.selectedChipIds) ? campaign.selectedChipIds : [];

                  return (
                    <TableRow key={campaign.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                      {/* Nome — clickable link to detail page */}
                      <TableCell className="font-medium text-sm">
                        <Link
                          href={`/campanhas/${campaign.id}`}
                          className="hover:text-primary hover:underline underline-offset-2 transition-colors"
                        >
                          {campaign.name}
                        </Link>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        <StatusBadge status={campaign.status} />
                      </TableCell>

                      {/* Segmento chip */}
                      <TableCell>
                        {segment ? (
                          <SegmentChip name={segment.name} />
                        ) : campaign.segmentId ? (
                          <span className="text-muted-foreground/60 italic text-xs">Removido</span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Chip pills */}
                      <TableCell>
                        <ChipPills chipIds={chipIds} allChips={allChips} />
                      </TableCell>

                      {/* Date range / scheduled */}
                      <TableCell>
                        <DateRangeCell campaign={campaign} />
                      </TableCell>

                      {/* Progress bar */}
                      <TableCell>
                        <ProgressCell campaign={campaign} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Activate / Pause / Resume */}
                          <ActivatePauseButton
                            campaign={campaign}
                            onActivate={handleActivate}
                            onPause={(id) => setPauseId(id)}
                            onResume={handleResume}
                            loading={actionLoading === campaign.id}
                          />

                          {/* Monitor */}
                          {(campaign.status === 'scheduled' || campaign.status === 'sending' || campaign.status === 'sent') && (
                            <Link href={`/campanhas/${campaign.id}/monitor`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Monitorar campanha">
                                <BarChart3 className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}

                          {/* Edit */}
                          {campaign.status === 'draft' && (
                            <Link href={`/campanhas/${campaign.id}/editar`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Editar campanha">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}

                          {/* Duplicate */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Duplicar campanha"
                            onClick={() => handleDuplicate(campaign)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                            title="Excluir campanha"
                            onClick={() => setDeleteId(campaign.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {filteredCampaigns.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-muted-foreground">
              {filteredCampaigns.length} campanha(s) encontrada(s)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground min-w-16 text-center">
                Página {currentPage} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha e todos os seus dados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause confirm dialog */}
      <AlertDialog open={!!pauseId} onOpenChange={open => !open && setPauseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              {pauseId && (() => {
                const c = campaigns.find(x => x.id === pauseId);
                return c ? `Tem certeza que deseja pausar a campanha "${c.name}"?` : 'Tem certeza que deseja pausar esta campanha?';
              })()}
              {' '}Você poderá retomá-la a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePause}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Pausar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
