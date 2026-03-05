'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Users, Upload, Search, Eye, Plus, Trash2 } from 'lucide-react';

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

const PAGE_LIMIT = 50;

const EMPTY_FORM = {
  name: '',
  phone: '',
  cpf: '',
  zone: '',
  section: '',
  neighborhood: '',
  tags: '',
};

type PaginatedVotersResponse = {
  data: Voter[];
  total: number;
  page: number;
  limit: number;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const router = useRouter();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVoters, setTotalVoters] = useState(0);
  const [voterToDelete, setVoterToDelete] = useState<Voter | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async (q: string, page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (q) {
        params.set('search', q);
      }

      const res = await fetch(`/api/voters?${params.toString()}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Erro ao carregar eleitores');
      }

      const result: PaginatedVotersResponse = await res.json();
      setVoters(result.data);
      setTotalVoters(result.total);
      setCurrentPage(result.page);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    void load(debouncedSearch, currentPage);
  }, [currentPage, debouncedSearch, load]);

  const totalPages = Math.max(Math.ceil(totalVoters / PAGE_LIMIT), 1);
  const startIndex = totalVoters === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const endIndex = totalVoters === 0 ? 0 : Math.min(currentPage * PAGE_LIMIT, totalVoters);

  const refreshPage = async (page = currentPage) => {
    await load(debouncedSearch, page);
  };

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  const handleAddVoter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        cpf: form.cpf.trim() || null,
        zone: form.zone.trim() || null,
        section: form.section.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const res = await fetch('/api/voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Erro ao adicionar eleitor');
      }

      toast.success('Eleitor adicionado');
      setIsAddDialogOpen(false);
      resetForm();
      setCurrentPage(1);
      if (currentPage === 1) {
        await refreshPage(1);
      }
    } catch {
      toast.error('Erro ao adicionar eleitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVoter = async () => {
    if (!voterToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/voters?id=${voterToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Erro ao excluir eleitor');
      }

      toast.success('Eleitor excluído');
      const nextPage = currentPage > 1 && voters.length === 1 ? currentPage - 1 : currentPage;
      setVoterToDelete(null);
      setCurrentPage(nextPage);
      if (nextPage === currentPage) {
        await refreshPage(nextPage);
      }
    } catch {
      toast.error('Erro ao excluir eleitor');
    } finally {
      setIsDeleting(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Adicionar eleitor
            </Button>
            <Link href="/segmentacao/importar">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="h-4 w-4" />
                Importar eleitores
              </Button>
            </Link>
          </div>
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
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/crm/${voter.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setVoterToDelete(voter)}
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

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            {totalVoters === 0
              ? 'Mostrando 0 de 0 eleitores'
              : `Mostrando ${startIndex}-${endIndex} de ${totalVoters} eleitores`}
          </p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Anterior
            </Button>
            <span className="min-w-16 text-center text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar eleitor</DialogTitle>
            <DialogDescription>
              Cadastre um eleitor manualmente para acompanhamento direto no CRM.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleAddVoter}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="voter-name" className="text-sm font-medium text-foreground">
                  Nome
                </label>
                <Input
                  id="voter-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-phone" className="text-sm font-medium text-foreground">
                  Telefone
                </label>
                <Input
                  id="voter-phone"
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-cpf" className="text-sm font-medium text-foreground">
                  CPF
                </label>
                <Input
                  id="voter-cpf"
                  value={form.cpf}
                  onChange={(event) => updateForm('cpf', event.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-zone" className="text-sm font-medium text-foreground">
                  Zona
                </label>
                <Input
                  id="voter-zone"
                  value={form.zone}
                  onChange={(event) => updateForm('zone', event.target.value)}
                  placeholder="123"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-section" className="text-sm font-medium text-foreground">
                  Seção
                </label>
                <Input
                  id="voter-section"
                  value={form.section}
                  onChange={(event) => updateForm('section', event.target.value)}
                  placeholder="456"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-neighborhood" className="text-sm font-medium text-foreground">
                  Bairro
                </label>
                <Input
                  id="voter-neighborhood"
                  value={form.neighborhood}
                  onChange={(event) => updateForm('neighborhood', event.target.value)}
                  placeholder="Centro"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-tags" className="text-sm font-medium text-foreground">
                  Tags
                </label>
                <Input
                  id="voter-tags"
                  value={form.tags}
                  onChange={(event) => updateForm('tags', event.target.value)}
                  placeholder="lideranca, apoiador, visita"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar eleitor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(voterToDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setVoterToDelete(null); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir eleitor</AlertDialogTitle>
            <AlertDialogDescription>
              {voterToDelete
                ? `Tem certeza que deseja excluir ${voterToDelete.name}?`
                : 'Tem certeza que deseja excluir este eleitor?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleDeleteVoter}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
