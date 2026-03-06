'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Megaphone, Pencil, Trash2, BarChart3, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign, Segment } from '@/db/schema';

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
  const s = status ?? 'rascunho';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_CLASSES[s] ?? STATUS_CLASSES.rascunho)}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    try {
      const [campaignsRes, segmentsRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/segments'),
      ]);

      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (segmentsRes.ok) setSegments(await segmentsRes.json());
    } catch {
      /* silently fail */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/campaigns?id=${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Campanha removida');
        setCampaigns(prev => prev.filter(c => c.id !== deleteId));
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
        loadCampaigns();
      }
    } catch {
      toast.error('Erro ao duplicar campanha');
    }
  };

  const segmentNames = new Map(segments.map((segment) => [segment.id, segment.name]));

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

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Carregando campanhas...
          </div>
        ) : campaigns.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">Nenhuma campanha ainda</h3>
              <p className="text-sm text-muted-foreground max-w-[320px]">
                Crie sua primeira campanha para começar a enviar mensagens personalizadas ao seu segmento.
              </p>
            </div>
            <Link href="/campanhas/nova">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira campanha
              </Button>
            </Link>
          </div>
        ) : (
          /* Campaigns table */
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[240px]">Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Agendado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(campaign => (
                  <TableRow key={campaign.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{campaign.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.segmentId ? (
                        segmentNames.has(campaign.segmentId) ? (
                          <span>{segmentNames.get(campaign.segmentId)}</span>
                        ) : (
                          <span className="text-muted-foreground/70 italic">Segmento removido</span>
                        )
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground truncate">
                      {campaign.template
                        ? campaign.template.slice(0, 60) + (campaign.template.length > 60 ? '…' : '')
                        : <span className="text-muted-foreground/40 italic">Sem mensagem</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.scheduledAt
                        ? new Date(campaign.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(campaign.status === 'scheduled' || campaign.status === 'sending' || campaign.status === 'sent') && (
                          <Link href={`/campanhas/${campaign.id}/monitor`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <BarChart3 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        {campaign.status === 'draft' && (
                          <Link href={`/campanhas/${campaign.id}/editar`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDuplicate(campaign)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(campaign.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </SidebarLayout>
  );
}
