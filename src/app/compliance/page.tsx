'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldCheck, ShieldOff, ShieldAlert, Clock, Download, Search, Eye, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Voter } from '@/db/schema';
import type { ConsentLogWithVoter } from '@/lib/db-compliance';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  active?: number;
  pending?: number;
  expired?: number;
  revoked?: number;
  [key: string]: number | undefined;
}

interface VoterWithConsent extends Voter {
  lastAction?: string;
  lastActionDate?: string;
}

interface PaginatedVotersResponse {
  data: VoterWithConsent[];
  total: number;
  page: number;
  limit: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPT_IN_LABELS: Record<string, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  expired: 'Expirado',
  revoked: 'Revogado',
};

const OPT_IN_CLASSES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  expired: 'bg-muted text-muted-foreground border-border',
  revoked: 'bg-red-500/10 text-red-600 border-red-200',
};

const ACTION_LABELS: Record<string, string> = {
  opt_in: 'Opt-in',
  opt_out: 'Opt-out',
  renew: 'Renovação',
  revoke: 'Revogação',
};

const STAT_CARDS = [
  { key: 'active', label: 'Ativos', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-500/10' },
  { key: 'pending', label: 'Pendentes', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  { key: 'expired', label: 'Expirados', icon: ShieldAlert, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  { key: 'revoked', label: 'Revogados', icon: ShieldOff, color: 'text-red-600', bg: 'bg-red-500/10' },
];

// ─── CSV Export helper ────────────────────────────────────────────────────────

function exportCsv(logs: ConsentLogWithVoter[]) {
  const header = 'Eleitor,Telefone,Ação,Canal,Data';
  const rows = logs.map(l => [
    l.voterName ?? 'Anônimo',
    l.voterPhone ?? '',
    ACTION_LABELS[l.action ?? ''] ?? l.action,
    l.channel ?? '',
    l.createdAt ? new Date(l.createdAt).toLocaleString('pt-BR') : '',
  ].map(v => `"${v}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-lgpd-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadAllVoters(): Promise<VoterWithConsent[]> {
  const limit = 100;
  const firstResponse = await fetch(`/api/voters?page=1&limit=${limit}`);
  if (!firstResponse.ok) {
    return [];
  }

  const firstPayload = await firstResponse.json() as PaginatedVotersResponse | VoterWithConsent[];
  if (Array.isArray(firstPayload)) {
    return firstPayload;
  }

  const voters = [...firstPayload.data];
  const totalPages = Math.max(1, Math.ceil((firstPayload.total ?? voters.length) / (firstPayload.limit || limit)));

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetch(`/api/voters?page=${page}&limit=${limit}`);
    if (!response.ok) {
      break;
    }

    const payload = await response.json() as PaginatedVotersResponse | VoterWithConsent[];
    voters.push(...(Array.isArray(payload) ? payload : payload.data));
  }

  return voters;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [stats, setStats] = useState<Stats>({});
  const [voters, setVoters] = useState<VoterWithConsent[]>([]);
  const [allLogs, setAllLogs] = useState<ConsentLogWithVoter[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [historyVoter, setHistoryVoter] = useState<VoterWithConsent | null>(null);
  const [voterHistory, setVoterHistory] = useState<ConsentLogWithVoter[]>([]);
  const [confirmAnon, setConfirmAnon] = useState<VoterWithConsent | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stats + voters + all logs
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, voters] = await Promise.all([
        fetch('/api/compliance?stats=1'),
        fetch('/api/compliance?all=1'),
        loadAllVoters(),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (logsRes.ok) setAllLogs(await logsRes.json());
      setVoters(voters);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load voter history for expand dialog
  const openHistory = useCallback(async (voter: VoterWithConsent) => {
    setHistoryVoter(voter);
    const res = await fetch(`/api/compliance?voterId=${voter.id}`);
    if (res.ok) setVoterHistory(await res.json());
  }, []);

  // Revoke voter consent
  const revokeVoter = useCallback(async (voter: VoterWithConsent) => {
    await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: voter.id, action: 'revoke', channel: 'admin' }),
    });
    setVoters(prev => prev.map(v => v.id === voter.id ? { ...v, optInStatus: 'revoked' } : v));
    setStats(prev => ({
      ...prev,
      revoked: (prev.revoked ?? 0) + 1,
      [voter.optInStatus ?? 'active']: Math.max(0, (prev[voter.optInStatus ?? 'active'] ?? 0) - 1),
    }));
  }, []);

  // Anonymize voter
  const anonymizeVoter = useCallback(async (voter: VoterWithConsent) => {
    await fetch('/api/voters', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: voter.id, name: 'Eleitor Anônimo', phone: '****', cpf: '***' }),
    });
    setVoters(prev => prev.map(v => v.id === voter.id ? { ...v, name: 'Eleitor Anônimo', phone: '****', cpf: '***' } : v));
    setConfirmAnon(null);
  }, []);

  // Filter voters for consent table
  const filteredVoters = voters.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name?.toLowerCase().includes(q) || v.phone?.includes(q);
    const matchStatus = statusFilter === 'all' || v.optInStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  // Filter audit logs
  const filteredLogs = allLogs.filter(l => {
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    if (!matchAction) return false;
    if (dateFilter === 'all') return true;
    if (!l.createdAt) return false;
    const days = dateFilter === '7' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(l.createdAt) >= cutoff;
  });

  return (
    <SidebarLayout currentPage="compliance">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Conformidade LGPD</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestão de consentimento e rastreabilidade de dados eleitorais</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(allLogs)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar relatório
          </Button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_CARDS.map(card => {
            const Icon = card.icon;
            const count = stats[card.key] ?? 0;
            return (
              <div key={card.key} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className={cn('rounded-lg p-2', card.bg)}>
                  <Icon className={cn('h-4 w-4', card.color)} />
                </div>
                <div>
                  <div className="text-xl font-semibold tabular-nums">{loading ? '—' : count}</div>
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="consent">
          <TabsList>
            <TabsTrigger value="consent">Consentimentos</TabsTrigger>
            <TabsTrigger value="audit">Linha do Tempo</TabsTrigger>
          </TabsList>

          {/* ── Consent Table Tab ── */}
          <TabsContent value="consent" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="revoked">Revogado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Eleitor</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data opt-in</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : filteredVoters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Nenhum eleitor encontrado
                      </TableCell>
                    </TableRow>
                  ) : filteredVoters.map(voter => (
                    <TableRow key={voter.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{voter.name}</TableCell>
                      <TableCell className="text-muted-foreground">{voter.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', OPT_IN_CLASSES[voter.optInStatus ?? 'pending'])}>
                          {OPT_IN_LABELS[voter.optInStatus ?? 'pending']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {voter.optInDate ? new Date(voter.optInDate).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openHistory(voter)} className="h-7 px-2 gap-1 text-xs">
                            <Eye className="h-3 w-3" />
                            Histórico
                          </Button>
                          {voter.optInStatus !== 'revoked' && (
                            <Button size="sm" variant="ghost" onClick={() => revokeVoter(voter)} className="h-7 px-2 gap-1 text-xs text-red-600 hover:text-red-700">
                              <ShieldOff className="h-3 w-3" />
                              Revogar
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setConfirmAnon(voter)} className="h-7 px-2 gap-1 text-xs text-muted-foreground">
                            <UserX className="h-3 w-3" />
                            Anonimizar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Audit Timeline Tab ── */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    <SelectItem value="opt_in">Opt-in</SelectItem>
                    <SelectItem value="opt_out">Opt-out</SelectItem>
                    <SelectItem value="renew">Renovação</SelectItem>
                    <SelectItem value="revoke">Revogação</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportCsv(filteredLogs)} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Sem eventos de auditoria registrados
              </div>
            ) : (
              <div className="space-y-0 relative">
                <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
                {filteredLogs.map((log, idx) => (
                  <div key={log.id ?? idx} className="relative flex gap-4 pb-4 pl-12">
                    <div className="absolute left-3 top-1 h-4 w-4 rounded-full border-2 border-border bg-background flex items-center justify-center">
                      <ShieldCheck className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.voterName ?? 'Eleitor Anônimo'}</span>
                        <Badge variant="outline" className="text-xs">
                          {ACTION_LABELS[log.action ?? ''] ?? log.action}
                        </Badge>
                        {log.channel && (
                          <span className="text-xs text-muted-foreground">via {log.channel}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* History Dialog */}
      <Dialog open={!!historyVoter} onOpenChange={open => !open && setHistoryVoter(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de consentimento — {historyVoter?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto py-2">
            {voterHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem histórico registrado</p>
            ) : voterHistory.map((log, idx) => (
              <div key={log.id ?? idx} className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="text-xs shrink-0">
                  {ACTION_LABELS[log.action ?? ''] ?? log.action}
                </Badge>
                <span className="text-muted-foreground">{log.channel ?? 'N/A'}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : '—'}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryVoter(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Anonymize Dialog */}
      <Dialog open={!!confirmAnon} onOpenChange={open => !open && setConfirmAnon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar anonimização</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja anonimizar <strong>{confirmAnon?.name}</strong>? Esta ação é irreversível e substituirá nome, CPF e telefone por dados genéricos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAnon(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmAnon && anonymizeVoter(confirmAnon)}>
              Anonimizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
