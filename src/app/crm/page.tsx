'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/use-swr';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPhoneDisplay } from '@/lib/phone';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { cn } from '@/lib/utils';
import type { Voter } from '@/db/schema';
import { Users, Upload, Search, Eye, Plus, Trash2, Download, Tag, X, Loader2, Layers } from 'lucide-react';

// Extended voter type that includes enriched segment data from API
type VoterWithSegments = Voter & { segments?: Array<{ id: string; name: string }> };

interface SegmentOption {
  id: string;
  name: string;
  audienceCount: number;
}

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

// ─── Tag Picker ───────────────────────────────────────────────────────────────

interface TagPickerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

function TagPicker({ selected, onChange, suggestions }: TagPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '_');
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(selected.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    }
  };

  const filteredSuggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    return suggestions
      .filter((s) => !selected.includes(s) && (q === '' || s.includes(q)))
      .slice(0, 8);
  }, [inputValue, selected, suggestions]);

  return (
    <div className="space-y-2">
      {/* Selected chips + input */}
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] rounded-md border border-input bg-background px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-destructive transition-colors"
              aria-label={`Remover tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={selected.length === 0 ? 'Digite uma tag e pressione Enter ou vírgula...' : ''}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Tag className="h-2.5 w-2.5" />
              {s}
            </button>
          ))}
        </div>
      )}
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
  address: '',
  cep: '',
  eventLocation: '',
  eventCep: '',
  eventDate: '',
  projectName: '',
  subsecretaria: '',
};

type PaginatedVotersResponse = {
  data: VoterWithSegments[];
  total: number;
  page: number;
  limit: number;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [voterToDelete, setVoterToDelete] = useState<VoterWithSegments | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Tags managed separately as string[] for the TagPicker
  const [formTags, setFormTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tierFilter, setTierFilter] = useState('all');
  const [optInFilter, setOptInFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [subsecretariaFilter, setSubsecretariaFilter] = useState('');
  const [filterSegments, setFilterSegments] = useState<SegmentOption[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [selectedVoterIds, setSelectedVoterIds] = useState<Set<string>>(new Set());
  const [editingVoterId, setEditingVoterId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VoterWithSegments>>({});
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  // Add-to-segment bulk action
  const [isSegmentDialogOpen, setIsSegmentDialogOpen] = useState(false);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [isAddingToSegment, setIsAddingToSegment] = useState(false);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);

  // Build SWR key from filters
  const votersKey = useMemo(() => {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(PAGE_LIMIT),
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (tierFilter !== 'all') params.set('tier', tierFilter);
    if (optInFilter !== 'all') params.set('optIn', optInFilter);
    if (zoneFilter !== 'all') params.set('zone', zoneFilter);
    if (tagFilter) params.set('tag', tagFilter);
    if (segmentFilter !== 'all') params.set('segmentId', segmentFilter);
    if (projectFilter) params.set('projectName', projectFilter);
    if (subsecretariaFilter) params.set('subsecretaria', subsecretariaFilter);
    return `/api/voters?${params.toString()}`;
  }, [currentPage, debouncedSearch, tierFilter, optInFilter, zoneFilter, tagFilter, segmentFilter, projectFilter, subsecretariaFilter]);

  // SWR-based data fetching
  const { data: votersResponse, error: votersError, isLoading, mutate: mutateVoters } = useSWR<PaginatedVotersResponse>(votersKey, fetcher);

  // Derived values from SWR response
  const voters = votersResponse?.data ?? [];
  const totalVoters = votersResponse?.total ?? 0;

  // Handle auth errors
  useEffect(() => {
    if (votersError) {
      const errorMsg = (votersError as Error)?.message;
      if (errorMsg?.includes('401') || errorMsg?.includes('Unauthorized')) {
        router.push('/login');
      } else {
        toast.error('Erro ao carregar eleitores');
      }
    }
  }, [votersError, router]);

  // Load filter options once on mount
  useEffect(() => {
    fetch('/api/segments')
      .then(r => r.ok ? r.json() : [])
      .then((data: SegmentOption[]) => setFilterSegments(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch('/api/segments?action=filter-options')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tags) setFilterTags(d.tags); })
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tierFilter, optInFilter, zoneFilter, tagFilter, segmentFilter, projectFilter, subsecretariaFilter]);

  // Load available tags when add-voter dialog opens
  useEffect(() => {
    if (!isAddDialogOpen) return;
    fetch('/api/segments?action=filter-options')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.tags) setAvailableTags(data.tags); })
      .catch(() => {});
  }, [isAddDialogOpen]);

  // Load segments when add-to-segment dialog opens
  useEffect(() => {
    if (!isSegmentDialogOpen) return;
    setIsLoadingSegments(true);
    setSelectedSegmentId('');
    fetch('/api/segments')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SegmentOption[]) => {
        setSegments(Array.isArray(data) ? data : []);
      })
      .catch(() => setSegments([]))
      .finally(() => setIsLoadingSegments(false));
  }, [isSegmentDialogOpen]);

  const totalPages = Math.max(Math.ceil(totalVoters / PAGE_LIMIT), 1);
  const startIndex = totalVoters === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const endIndex = totalVoters === 0 ? 0 : Math.min(currentPage * PAGE_LIMIT, totalVoters);

  const refreshPage = useCallback(async () => {
    await mutateVoters();
  }, [mutateVoters]);

  // All filtering is now server-side — voters from API are already filtered
  const filteredVoters = voters;

  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    voters.forEach(v => { if (v.zone) zones.add(v.zone); });
    return Array.from(zones).sort();
  }, [voters]);

  const hasActiveFilters = tierFilter !== 'all' || optInFilter !== 'all' || zoneFilter !== 'all'
    || !!tagFilter || segmentFilter !== 'all' || !!projectFilter || !!subsecretariaFilter;

  const clearAllFilters = () => {
    setTierFilter('all'); setOptInFilter('all'); setZoneFilter('all');
    setTagFilter(''); setSegmentFilter('all'); setProjectFilter(''); setSubsecretariaFilter('');
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedVoterIds);
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/voters?id=${id}`, { method: 'DELETE' }))
      );
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      toast.success(`${successCount} eleitor(es) removido(s)`);
      setSelectedVoterIds(new Set());
      void refreshPage();
    } catch { toast.error('Erro ao excluir eleitores'); }
  };

  const handleBulkExport = () => {
    const votersToExport = selectedVoterIds.size > 0
      ? voters.filter(v => selectedVoterIds.has(v.id))
      : filteredVoters;
    const headers = ['Nome','Telefone','CPF','Zona','Seção','Bairro','Endereço','CEP','Local do Evento','CEP Evento','Data Evento','Projeto','Subsecretaria','Tags','Engajamento','Opt-in','Último Contato','Tier IA','Sentimento IA','Resumo IA','Ação IA','Notas CRM','Criado em'];
    const rows = votersToExport.map(v => [
      v.name, v.phone, v.cpf ?? '', v.zone ?? '', v.section ?? '', v.neighborhood ?? '',
      v.address ?? '', v.cep ?? '', v.eventLocation ?? '', v.eventCep ?? '', v.eventDate ?? '',
      v.projectName ?? '', v.subsecretaria ?? '',
      (v.tags ?? []).join('; '), String(v.engagementScore ?? 0), v.optInStatus ?? '',
      v.lastContacted ? new Date(v.lastContacted).toISOString() : '',
      v.aiTier ?? '', v.aiSentiment ?? '', v.aiAnalysisSummary ?? '', v.aiRecommendedAction ?? '',
      v.crmNotes ?? '', v.createdAt ? new Date(v.createdAt).toISOString() : '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eleitores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${votersToExport.length} eleitor(es) exportado(s)`);
  };

  const handleAddToSegment = async () => {
    if (!selectedSegmentId) return;
    setIsAddingToSegment(true);
    try {
      const res = await fetch('/api/segments?action=add-voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: selectedSegmentId,
          voterIds: Array.from(selectedVoterIds),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { added: number; total: number };
      const seg = segments.find((s) => s.id === selectedSegmentId);
      toast.success(
        `${data.added} eleitor(es) adicionado(s) ao segmento "${seg?.name ?? ''}"`,
      );
      setIsSegmentDialogOpen(false);
      setSelectedVoterIds(new Set());
    } catch {
      toast.error('Erro ao adicionar ao segmento');
    } finally {
      setIsAddingToSegment(false);
    }
  };

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormTags([]);
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
        tags: formTags,
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
      await mutateVoters();
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
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      } else {
        await mutateVoters();
      }
    } catch {
      toast.error('Erro ao excluir eleitor');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SidebarLayout currentPage="crm" pageTitle="CRM">
      <div className="p-6 space-y-6 bg-background min-h-full">

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

        {/* Search + Export */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleBulkExport}>
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {/* Tier IA */}
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Tier IA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tiers</SelectItem>
              <SelectItem value="hot">Quente</SelectItem>
              <SelectItem value="warm">Morno</SelectItem>
              <SelectItem value="cold">Frio</SelectItem>
              <SelectItem value="dead">Inativo</SelectItem>
            </SelectContent>
          </Select>

          {/* Opt-in */}
          <Select value={optInFilter} onValueChange={setOptInFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Opt-in" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
              <SelectItem value="revoked">Revogado</SelectItem>
            </SelectContent>
          </Select>

          {/* Zona */}
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas zonas</SelectItem>
              {availableZones.map(z => (
                <SelectItem key={z} value={z}>Zona {z}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Segmento */}
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs gap-1">
              <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {filterSegments.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tag */}
          <Select value={tagFilter || 'all'} onValueChange={v => setTagFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs gap-1">
              <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas tags</SelectItem>
              {filterTags.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Projeto */}
          {projectFilter ? (
            <div className="flex items-center gap-1 h-8 rounded-md border border-primary/30 bg-primary/5 px-2 text-xs text-primary">
              <span>Projeto: {projectFilter}</span>
              <button onClick={() => setProjectFilter('')}><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <Input
              placeholder="Filtrar projeto..."
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="h-8 w-[150px] text-xs"
            />
          )}

          {/* Subsecretaria */}
          {subsecretariaFilter ? (
            <div className="flex items-center gap-1 h-8 rounded-md border border-primary/30 bg-primary/5 px-2 text-xs text-primary">
              <span>Subsec: {subsecretariaFilter.slice(0, 20)}{subsecretariaFilter.length > 20 ? '…' : ''}</span>
              <button onClick={() => setSubsecretariaFilter('')}><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <Input
              placeholder="Filtrar subsecretaria..."
              value={subsecretariaFilter}
              onChange={e => setSubsecretariaFilter(e.target.value)}
              className="h-8 w-[170px] text-xs"
            />
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAllFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Bulk actions toolbar */}
        {selectedVoterIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
            <span className="text-xs font-medium">{selectedVoterIds.size} selecionado(s)</span>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setIsSegmentDialogOpen(true)}
              >
                <Tag className="h-3 w-3" />
                Adicionar ao segmento
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkExport}>
                Exportar CSV
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedVoterIds.size} eleitor(es)?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void handleBulkDelete()}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedVoterIds(new Set())}>
                Limpar seleção
              </Button>
            </div>
          </div>
        )}

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
          <div className="rounded-xl border border-border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      className="rounded border-border cursor-pointer"
                      checked={selectedVoterIds.size > 0 && filteredVoters.every(v => selectedVoterIds.has(v.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedVoterIds(new Set(filteredVoters.map(v => v.id)));
                        else setSelectedVoterIds(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">IA</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Opt-in</TableHead>
                  <TableHead>Engajamento</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Segmentos</TableHead>
                  <TableHead>Último contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVoters.map(voter => (
                  <React.Fragment key={voter.id}>
                  <TableRow
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      if (editingVoterId === voter.id) {
                        setEditingVoterId(null);
                      } else {
                        setEditingVoterId(voter.id);
                        setEditTags(voter.tags ?? []);
                        setEditTagInput('');
                        setEditForm({ name: voter.name, phone: voter.phone, zone: voter.zone ?? '', section: voter.section ?? '', optInStatus: voter.optInStatus ?? 'pending', crmNotes: voter.crmNotes ?? '', address: voter.address ?? '', projectName: voter.projectName ?? '', subsecretaria: voter.subsecretaria ?? '' });
                      }
                    }}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-border cursor-pointer"
                        checked={selectedVoterIds.has(voter.id)}
                        onChange={() => setSelectedVoterIds(prev => { const next = new Set(prev); if (next.has(voter.id)) next.delete(voter.id); else next.add(voter.id); return next; })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {voter.aiTier && (
                          <span className={cn('h-2 w-2 rounded-full shrink-0',
                            voter.aiTier === 'hot' ? 'bg-red-500' :
                            voter.aiTier === 'warm' ? 'bg-amber-500' :
                            voter.aiTier === 'cold' ? 'bg-blue-500' : 'bg-gray-400'
                          )} title={`Tier: ${voter.aiTier}`} />
                        )}
                        {voter.aiSentiment && (
                          <span className={cn('text-[10px] font-medium',
                            voter.aiSentiment === 'positive' ? 'text-green-600' :
                            voter.aiSentiment === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                          )}>
                            {voter.aiSentiment === 'positive' ? '+' : voter.aiSentiment === 'negative' ? '−' : '~'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{voter.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{formatPhoneDisplay(voter.phone)}</TableCell>
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
                     <TableCell className="whitespace-normal">
                       <div
                         className="flex items-center gap-1 flex-wrap max-w-[200px]"
                         title={(voter.tags ?? []).join(', ') || undefined}
                       >
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
                     <TableCell className="whitespace-normal">
                       {(voter.segments ?? []).length === 0 ? (
                         <span className="text-muted-foreground/40 text-xs">—</span>
                       ) : (
                         <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                           {(voter.segments ?? []).slice(0, 2).map(seg => (
                             <span key={seg.id} className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                               {seg.name}
                             </span>
                           ))}
                           {(voter.segments ?? []).length > 2 && (
                             <span className="text-[10px] text-muted-foreground">+{(voter.segments ?? []).length - 2}</span>
                           )}
                         </div>
                       )}
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
                  {/* Inline editor */}
                   {editingVoterId === voter.id && (
                    <TableRow key={`edit-${voter.id}`}>
                       <TableCell colSpan={11} className="bg-muted/10 border-l-4 border-l-primary/30 p-0" onClick={e => e.stopPropagation()}>
                        <div className="p-4 space-y-4">
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             <div className="flex flex-col gap-1.5">
                               <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</label>
                               <Input className="h-9 w-full" value={editForm.name ?? ''} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
                             </div>
                             <div className="flex flex-col gap-1.5">
                               <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</label>
                               <Input className="h-9 w-full" value={editForm.phone ?? ''} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
                             </div>
                             <div className="flex flex-col gap-1.5">
                               <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Zona</label>
                               <Input className="h-9 w-full" value={editForm.zone ?? ''} onChange={e => setEditForm(prev => ({ ...prev, zone: e.target.value }))} />
                             </div>
                             <div className="flex flex-col gap-1.5">
                               <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Seção</label>
                               <Input className="h-9 w-full" value={editForm.section ?? ''} onChange={e => setEditForm(prev => ({ ...prev, section: e.target.value }))} />
                             </div>
                             <div className="flex flex-col gap-1.5">
                               <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Opt-in</label>
                               <Select value={editForm.optInStatus ?? 'pending'} onValueChange={v => setEditForm(prev => ({ ...prev, optInStatus: v as 'active' | 'pending' | 'expired' | 'revoked' }))}>
                                 <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="active">Ativo</SelectItem>
                                   <SelectItem value="pending">Pendente</SelectItem>
                                   <SelectItem value="expired">Expirado</SelectItem>
                                   <SelectItem value="revoked">Revogado</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>
                             <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Endereço</label>
                                <Input className="h-9 w-full" value={editForm.address ?? ''} onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Rua, número..." />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">CEP</label>
                                <Input className="h-9 w-full" value={editForm.cep ?? ''} onChange={e => setEditForm(prev => ({ ...prev, cep: e.target.value }))} placeholder="00000-000" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Local do Evento</label>
                                <Input className="h-9 w-full" value={editForm.eventLocation ?? ''} onChange={e => setEditForm(prev => ({ ...prev, eventLocation: e.target.value }))} placeholder="Local de realização" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">CEP do Evento</label>
                                <Input className="h-9 w-full" value={editForm.eventCep ?? ''} onChange={e => setEditForm(prev => ({ ...prev, eventCep: e.target.value }))} placeholder="00000-000" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Projeto</label>
                                <Input className="h-9 w-full" value={editForm.projectName ?? ''} onChange={e => setEditForm(prev => ({ ...prev, projectName: e.target.value }))} placeholder="Nome do projeto" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Subsecretaria</label>
                                <Input className="h-9 w-full" value={editForm.subsecretaria ?? ''} onChange={e => setEditForm(prev => ({ ...prev, subsecretaria: e.target.value }))} placeholder="Subsecretaria responsável" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Data do Evento</label>
                                <Input className="h-9 w-full" value={editForm.eventDate ?? ''} onChange={e => setEditForm(prev => ({ ...prev, eventDate: e.target.value }))} placeholder="DD/MM/AAAA" />
                              </div>
                             <div className="flex flex-col gap-1.5">
                                 <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas</label>
                                 <textarea
                                   className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[38px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-y"
                                   value={editForm.crmNotes ?? ''}
                                   onChange={e => setEditForm(prev => ({ ...prev, crmNotes: e.target.value }))}
                                   placeholder="Observações sobre o eleitor..."
                                 />
                               </div>
                               {/* Tags inline editor */}
                               <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
                                 <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</label>
                                 <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border border-input bg-background px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-ring"
                                   onClick={() => document.getElementById(`tag-input-${voter.id}`)?.focus()}>
                                   {editTags.map(t => (
                                     <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                                       {t}
                                       <button type="button" onClick={() => setEditTags(prev => prev.filter(x => x !== t))}>
                                         <X className="h-3 w-3" />
                                       </button>
                                     </span>
                                   ))}
                                   <input
                                     id={`tag-input-${voter.id}`}
                                     value={editTagInput}
                                     onChange={e => setEditTagInput(e.target.value)}
                                     onKeyDown={e => {
                                       if (e.key === 'Enter' || e.key === ',') {
                                         e.preventDefault();
                                         const t = editTagInput.trim().toLowerCase().replace(/\s+/g, '_');
                                         if (t && !editTags.includes(t)) setEditTags(prev => [...prev, t]);
                                         setEditTagInput('');
                                       }
                                       if (e.key === 'Backspace' && !editTagInput && editTags.length) {
                                         setEditTags(prev => prev.slice(0, -1));
                                       }
                                     }}
                                     onBlur={() => {
                                       const t = editTagInput.trim().toLowerCase().replace(/\s+/g, '_');
                                       if (t && !editTags.includes(t)) setEditTags(prev => [...prev, t]);
                                       setEditTagInput('');
                                     }}
                                     placeholder={editTags.length === 0 ? 'Adicionar tag...' : ''}
                                     className="flex-1 min-w-[80px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                                   />
                                 </div>
                               </div>
                             </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/crm/${voter.id}`)}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver perfil
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingVoterId(null)}>Cancelar</Button>
                            <Button size="sm" onClick={async () => {
                              try {
                                const res = await fetch(`/api/voters`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ id: voter.id, ...editForm, tags: editTags }),
                                });
                                if (res.ok) {
                                  toast.success('Eleitor atualizado');
                                  setEditingVoterId(null);
                                  void refreshPage();
                                } else { toast.error('Erro ao atualizar'); }
                              } catch { toast.error('Erro ao atualizar eleitor'); }
                            }}>Salvar</Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
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

      {/* ── Add voter dialog ──────────────────────────────────────────────── */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
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

              <div className="space-y-2 sm:col-span-2">
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

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="voter-address" className="text-sm font-medium text-foreground">
                  Endereço Individual
                </label>
                <Input
                  id="voter-address"
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  placeholder="Rua das Flores, 123"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-cep" className="text-sm font-medium text-foreground">
                  CEP Individual
                </label>
                <Input
                  id="voter-cep"
                  value={form.cep}
                  onChange={(event) => updateForm('cep', event.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-event-date" className="text-sm font-medium text-foreground">
                  Data do Evento
                </label>
                <Input
                  id="voter-event-date"
                  value={form.eventDate}
                  onChange={(event) => updateForm('eventDate', event.target.value)}
                  placeholder="15/03/2025"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="voter-event-location" className="text-sm font-medium text-foreground">
                  Local de Realização do Evento
                </label>
                <Input
                  id="voter-event-location"
                  value={form.eventLocation}
                  onChange={(event) => updateForm('eventLocation', event.target.value)}
                  placeholder="Nome do local ou endereço do evento"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-event-cep" className="text-sm font-medium text-foreground">
                  CEP do Evento
                </label>
                <Input
                  id="voter-event-cep"
                  value={form.eventCep}
                  onChange={(event) => updateForm('eventCep', event.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="voter-project" className="text-sm font-medium text-foreground">
                  Nome do Projeto
                </label>
                <Input
                  id="voter-project"
                  value={form.projectName}
                  onChange={(event) => updateForm('projectName', event.target.value)}
                  placeholder="Nome do projeto"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="voter-subsecretaria" className="text-sm font-medium text-foreground">
                  Subsecretaria Responsável
                </label>
                <Input
                  id="voter-subsecretaria"
                  value={form.subsecretaria}
                  onChange={(event) => updateForm('subsecretaria', event.target.value)}
                  placeholder="Nome da subsecretaria"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Tags
                </label>
                <TagPicker
                  selected={formTags}
                  onChange={setFormTags}
                  suggestions={availableTags}
                />
                <p className="text-xs text-muted-foreground">
                  Pressione Enter ou vírgula para adicionar. Clique nas sugestões para reutilizar tags existentes.
                </p>
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

      {/* ── Add to segment dialog ─────────────────────────────────────────── */}
      <Dialog open={isSegmentDialogOpen} onOpenChange={setIsSegmentDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Adicionar ao segmento</DialogTitle>
            <DialogDescription>
              Selecione o segmento para associar os {selectedVoterIds.size} eleitor(es) selecionado(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isLoadingSegments ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando segmentos...
              </div>
            ) : segments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Nenhum segmento encontrado.</p>
                <Link href="/segmentacao">
                  <Button variant="outline" size="sm" onClick={() => setIsSegmentDialogOpen(false)}>
                    Criar segmento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {segments.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setSelectedSegmentId(seg.id)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selectedSegmentId === seg.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span className="font-medium text-sm">{seg.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {seg.audienceCount ?? 0} eleitores
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSegmentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddToSegment}
              disabled={!selectedSegmentId || isAddingToSegment}
            >
              {isAddingToSegment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <AlertDialog open={Boolean(voterToDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setVoterToDelete(null); }}>
        <AlertDialogContent className="sm:max-w-[425px]">
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
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteVoter}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
