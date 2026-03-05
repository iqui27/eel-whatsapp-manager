'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Voter } from '@/db/schema';
import { Users, Upload, Search, Eye } from 'lucide-react';

// ─── Opt-in status ────────────────────────────────────────────────────────────

const OPT_IN_LABELS: Record<string, string> = {
  active:  'Ativo',
  pending: 'Pendente',
  expired: 'Expirado',
  revoked: 'Revogado',
};

const OPT_IN_CLASSES: Record<string, string> = {
  active:  'bg-green-500/10 text-green-600 border-green-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  expired: 'bg-muted text-muted-foreground border-border',
  revoked: 'bg-red-500/10 text-red-600 border-red-200',
};

// ─── Engagement bar ───────────────────────────────────────────────────────────

function EngagementBar({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 60 ? 'bg-green-500' : s >= 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(s, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{s}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const router = useRouter();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (q = '') => {
    try {
      const url = q ? `/api/voters?search=${encodeURIComponent(q)}` : '/api/voters';
      const res = await fetch(url);
      if (res.status === 401) { router.push('/login'); return; }
      if (res.ok) setVoters(await res.json());
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <SidebarLayout currentPage="crm" pageTitle="CRM">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">CRM Eleitoral</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie perfis de eleitores, engajamento e histórico de contato
            </p>
          </div>
          <Link href="/segmentacao/importar">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Importar eleitores
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16 text-sm text-muted-foreground">Carregando...</div>
        ) : voters.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">
                {search ? 'Nenhum eleitor encontrado' : 'Nenhum eleitor importado'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {search
                  ? 'Tente um nome ou telefone diferente.'
                  : 'Importe sua base de eleitores para começar.'}
              </p>
            </div>
            {!search && (
              <Link href="/segmentacao/importar">
                <Button size="sm">
                  <Upload className="mr-1.5 h-4 w-4" />
                  Importar base
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Opt-in</TableHead>
                  <TableHead>Engajamento</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Último contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voters.map(voter => (
                  <TableRow key={voter.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/crm/${voter.id}`)}>
                    <TableCell className="font-medium text-sm">{voter.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{voter.phone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {voter.zone ? `Zona ${voter.zone}` : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', OPT_IN_CLASSES[voter.optInStatus ?? 'pending'])}>
                        {OPT_IN_LABELS[voter.optInStatus ?? 'pending']}
                      </span>
                    </TableCell>
                    <TableCell>
                      <EngagementBar score={voter.engagementScore} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap max-w-[140px]">
                        {(voter.tags ?? []).slice(0, 2).map(tag => (
                          <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
                            {tag}
                          </span>
                        ))}
                        {(voter.tags ?? []).length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{(voter.tags ?? []).length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {voter.lastContacted
                        ? new Date(voter.lastContacted).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                        <Link href={`/crm/${voter.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
