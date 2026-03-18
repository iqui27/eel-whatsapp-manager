'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  Filter,
  Pencil,
  Plus,
  Save,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Segment } from '@/db/schema';
import { cn } from '@/lib/utils';

type FilterType = 'select' | 'multiselect' | 'number';
type FilterCategory = 'geografico' | 'comportamental' | 'demografico';
type FilterOperator = 'AND' | 'OR';
type FilterValue = string | string[];

interface FilterDef {
  key: string;
  label: string;
  category: FilterCategory;
  type: FilterType;
  options?: string[];
}

interface ActiveFilter {
  id: string;
  key: string;
  value: FilterValue;
}

interface SavedCampaign {
  id: string;
  name: string;
  status: string | null;
  segmentId: string | null;
}

interface SavedSegment extends Segment {
  campaigns?: SavedCampaign[];
}

interface SegmentPayload {
  operator: FilterOperator;
  filters: Array<{
    id: string;
    key: string;
    value: FilterValue;
  }>;
}

interface FilterOptionsResponse {
  zones: string[];
  sections: string[];
  cities: string[];
  neighborhoods: string[];
  tags: string[];
  totalVoters: number;
}

interface PreviewResponse {
  count: number;
  voterIds: string[];
}

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  geografico: 'Geografico',
  comportamental: 'Comportamental',
  demografico: 'Demografico',
};

const CATEGORY_COLORS: Record<FilterCategory, string> = {
  geografico: 'bg-blue-500/10 text-blue-600',
  comportamental: 'bg-amber-500/10 text-amber-600',
  demografico: 'bg-purple-500/10 text-purple-600',
};

const FILTER_LABELS: Record<string, string> = {
  zone: 'Zona Eleitoral',
  section: 'Secao',
  city: 'Cidade',
  neighborhood: 'Bairro',
  optInStatus: 'Status de Opt-in',
  engagementScore: 'Score de Engajamento (min)',
  tags: 'Tags',
};

function createFilterId() {
  return Math.random().toString(36).slice(2);
}

/**
 * Generate a slugified tag from a name
 */
function slugifyForTag(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '_')     // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '')          // Trim underscores
    .replace(/_+/g, '_')              // Collapse consecutive underscores
    .substring(0, 50)                 // Limit length
    || 'segmento';
}

/**
 * Validate tag format
 */
function validateTag(tag: string): { valid: boolean; error?: string } {
  if (!tag) return { valid: true };
  if (tag.length < 2) return { valid: false, error: 'Minimo 2 caracteres' };
  if (tag.length > 50) return { valid: false, error: 'Maximo 50 caracteres' };
  const pattern = /^[a-z][a-z0-9_]*$/;
  if (!pattern.test(tag)) {
    return { valid: false, error: 'Apenas letras minusculas, numeros e underscore' };
  }
  return { valid: true };
}

function normalizeFilterValue(filter: ActiveFilter) {
  if (Array.isArray(filter.value)) {
    return filter.value
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return filter.value.trim();
}

function sanitizeFilters(filters: ActiveFilter[]) {
  return filters
    .map((filter) => ({
      ...filter,
      value: normalizeFilterValue(filter),
    }))
    .filter((filter) => {
      if (Array.isArray(filter.value)) {
        return filter.value.length > 0;
      }
      return filter.value !== '';
    });
}

function serializeFilters(filters: ActiveFilter[], operator: FilterOperator): SegmentPayload {
  return {
    operator,
    filters: sanitizeFilters(filters),
  };
}

function parseStoredFilters(input: string): SegmentPayload {
  try {
    const parsed = JSON.parse(input) as SegmentPayload | ActiveFilter[];

    if (Array.isArray(parsed)) {
      return {
        operator: 'AND',
        filters: parsed.map((filter) => ({
          id: filter.id || createFilterId(),
          key: filter.key,
          value: Array.isArray(filter.value) ? filter.value : String(filter.value ?? ''),
        })),
      };
    }

    return {
      operator: parsed.operator === 'OR' ? 'OR' : 'AND',
      filters: Array.isArray(parsed.filters)
        ? parsed.filters.map((filter) => ({
          id: filter.id || createFilterId(),
          key: filter.key,
          value: Array.isArray(filter.value) ? filter.value : String(filter.value ?? ''),
        }))
        : [],
    };
  } catch {
    return { operator: 'AND', filters: [] };
  }
}

function summarizeFilters(input: string) {
  const parsed = parseStoredFilters(input);
  if (parsed.filters.length === 0) return 'Sem filtros';

  const summary = parsed.filters
    .slice(0, 2)
    .map((filter) => {
      const label = FILTER_LABELS[filter.key] ?? filter.key;
      const value = Array.isArray(filter.value) ? filter.value.join(', ') : filter.value;
      return `${label}: ${value}`;
    })
    .join(' • ');

  return parsed.filters.length > 2 ? `${summary} +${parsed.filters.length - 2}` : summary;
}

function buildFilterDefs(options: FilterOptionsResponse | null): FilterDef[] {
  return [
    {
      key: 'zone',
      label: 'Zona Eleitoral',
      category: 'geografico',
      type: 'select',
      options: options?.zones ?? [],
    },
    {
      key: 'section',
      label: 'Secao',
      category: 'geografico',
      type: 'select',
      options: options?.sections ?? [],
    },
    {
      key: 'city',
      label: 'Cidade',
      category: 'geografico',
      type: 'select',
      options: options?.cities ?? [],
    },
    {
      key: 'neighborhood',
      label: 'Bairro',
      category: 'geografico',
      type: 'select',
      options: options?.neighborhoods ?? [],
    },
    {
      key: 'optInStatus',
      label: 'Status de Opt-in',
      category: 'comportamental',
      type: 'select',
      options: ['active', 'pending', 'expired', 'revoked'],
    },
    {
      key: 'engagementScore',
      label: 'Score de Engajamento (min)',
      category: 'comportamental',
      type: 'number',
    },
    {
      key: 'tags',
      label: 'Tags',
      category: 'demografico',
      type: 'multiselect',
      options: options?.tags ?? [],
    },
  ];
}

function FilterRow({
  filter,
  filterDefs,
  onUpdate,
  onRemove,
}: {
  filter: ActiveFilter;
  filterDefs: FilterDef[];
  onUpdate: (id: string, value: FilterValue) => void;
  onRemove: (id: string) => void;
}) {
  const def = filterDefs.find((item) => item.key === filter.key);
  if (!def) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{def.label}</span>
          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[def.category])}>
            {CATEGORY_LABELS[def.category]}
          </span>
        </div>

        {def.type === 'select' && def.options && (
          <select
            className="w-full max-w-[280px] rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={typeof filter.value === 'string' ? filter.value : ''}
            onChange={(event) => onUpdate(filter.id, event.target.value)}
          >
            <option value="">Selecionar...</option>
            {def.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        {def.type === 'number' && (
          <input
            type="number"
            min={0}
            max={100}
            className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={typeof filter.value === 'string' ? filter.value : ''}
            placeholder="0-100"
            onChange={(event) => onUpdate(filter.id, event.target.value)}
          />
        )}

        {def.type === 'multiselect' && def.options && (
          <div className="flex flex-wrap gap-1.5">
            {def.options.map((option) => {
              const currentValues = Array.isArray(filter.value) ? filter.value : [];
              const selected = currentValues.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    const nextValues = selected
                      ? currentValues.filter((item) => item !== option)
                      : [...currentValues, option];
                    onUpdate(filter.id, nextValues);
                  }}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(filter.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function SegmentacaoPage() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [logic, setLogic] = useState<FilterOperator>('AND');
  const [segmentName, setSegmentName] = useState('');
  const [segmentTag, setSegmentTag] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [selectedFilterKey, setSelectedFilterKey] = useState('');
  const [segments, setSegments] = useState<SavedSegment[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [segmentBeingEdited, setSegmentBeingEdited] = useState<SavedSegment | null>(null);

  const filterDefs = buildFilterDefs(filterOptions);
  const previewPayload = serializeFilters(activeFilters, logic);
  const hasValidFilters = previewPayload.filters.length > 0;
  const totalVoterCount = filterOptions?.totalVoters ?? 0;

  const loadSegments = useCallback(async () => {
    try {
      const response = await fetch('/api/segments');
      if (!response.ok) return;
      setSegments(await response.json());
    } catch {
      toast.error('Erro ao carregar segmentos');
    }
  }, []);

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/segments?action=filter-options');
      if (!response.ok) return;
      setFilterOptions(await response.json());
    } catch {
      toast.error('Erro ao carregar filtros disponiveis');
    }
  }, []);

  useEffect(() => {
    void loadSegments();
    void loadFilterOptions();
  }, [loadFilterOptions, loadSegments]);

  useEffect(() => {
    if (!hasValidFilters) {
      setAudienceCount(null);
      setIsPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const response = await fetch('/api/segments?action=preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: serializeFilters(activeFilters, logic) }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('preview-failed');
        }

        const preview = await response.json() as PreviewResponse;
        setAudienceCount(preview.count);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAudienceCount(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPreviewLoading(false);
        }
      }
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeFilters, hasValidFilters, logic]);

  const addFilter = () => {
    if (!selectedFilterKey) return;

    const def = filterDefs.find((item) => item.key === selectedFilterKey);
    if (!def) return;

    setActiveFilters((current) => [
      ...current,
      {
        id: createFilterId(),
        key: selectedFilterKey,
        value: def.type === 'multiselect' ? [] : '',
      },
    ]);
    setSelectedFilterKey('');
  };

  const updateFilter = (id: string, value: FilterValue) => {
    setActiveFilters((current) => current.map((filter) => (
      filter.id === id ? { ...filter, value } : filter
    )));
  };

  const removeFilter = (id: string) => {
    setActiveFilters((current) => current.filter((filter) => filter.id !== id));
  };

  const resetComposer = () => {
    setSegmentBeingEdited(null);
    setSegmentName('');
    setSegmentTag('');
    setTagError(null);
    setActiveFilters([]);
    setLogic('AND');
    setAudienceCount(null);
  };

  // Auto-generate tag from name
  const handleNameChange = (name: string) => {
    setSegmentName(name);
    // Only auto-generate if not editing or tag is empty
    if (!segmentBeingEdited && !segmentTag) {
      setSegmentTag(slugifyForTag(name));
    }
  };

  const handleTagChange = (tag: string) => {
    setSegmentTag(tag);
    const validation = validateTag(tag);
    setTagError(validation.valid ? null : validation.error ?? null);
  };

  const saveSegment = async () => {
    if (!segmentName.trim() || !hasValidFilters) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/segments', {
        method: segmentBeingEdited ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: segmentBeingEdited?.id,
          name: segmentName.trim(),
          segmentTag: segmentTag.trim() || null,
          filters: previewPayload,
          audienceCount: audienceCount ?? 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'save-failed');
      }

      toast.success(segmentBeingEdited ? 'Segmento atualizado com sucesso!' : 'Segmento salvo com sucesso!');
      resetComposer();
      await loadSegments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar segmento';
      toast.error(segmentBeingEdited ? message : message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingSegment = (segment: SavedSegment) => {
    const parsed = parseStoredFilters(segment.filters);
    setSegmentBeingEdited(segment);
    setSegmentName(segment.name);
    setSegmentTag(segment.segmentTag || '');
    setTagError(null);
    setLogic(parsed.operator);
    setActiveFilters(parsed.filters.map((filter) => ({
      id: filter.id || createFilterId(),
      key: filter.key,
      value: filter.value,
    })));
    setAudienceCount(segment.audienceCount ?? null);
  };

  const deleteSegment = async (segment: SavedSegment) => {
    const blockedCampaign = segment.campaigns?.find((campaign) => (
      campaign.status === 'scheduled' || campaign.status === 'sending'
    ));

    if (blockedCampaign) {
      toast.error(`Segmento em uso pela campanha ${blockedCampaign.name}`);
      return;
    }

    if (!window.confirm(`Excluir o segmento "${segment.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/segments?id=${segment.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('delete-failed');
      }

      if (segmentBeingEdited?.id === segment.id) {
        resetComposer();
      }

      setSegments((current) => current.filter((item) => item.id !== segment.id));
      toast.success('Segmento excluido com sucesso!');
    } catch {
      toast.error('Erro ao excluir segmento');
    }
  };

  const riskLevel = previewPayload.filters.some((filter) => filter.key === 'optInStatus' && filter.value === 'active')
    ? 'Baixo'
    : 'Medio';

  const coveragePct = audienceCount !== null && totalVoterCount > 0
    ? Math.min(100, Math.round((audienceCount / totalVoterCount) * 100))
    : null;

  return (
    <SidebarLayout currentPage="segmentacao" pageTitle="Segmentacao">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Segmentacao</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie segmentos de audiencia com filtros reais da base eleitoral
            </p>
          </div>
          <Link href="/segmentacao/importar">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Importar eleitores
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-primary" />
                  Construtor de Segmento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {segmentBeingEdited && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    Editando <span className="font-medium">{segmentBeingEdited.name}</span>. Ajuste os filtros e salve as alteracoes.
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">Logica:</span>
                  <div className="flex overflow-hidden rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setLogic('AND')}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium transition-colors',
                        logic === 'AND'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      E (AND)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogic('OR')}
                      className={cn(
                        'border-l border-border px-3 py-1.5 text-sm font-medium transition-colors',
                        logic === 'OR'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      OU (OR)
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {logic === 'AND'
                      ? 'Todos os filtros devem ser verdadeiros'
                      : 'Qualquer filtro e suficiente'}
                  </span>
                </div>

                <div className="min-h-[48px] space-y-2">
                  {activeFilters.length === 0 ? (
                    <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      Nenhum filtro adicionado. Clique em &quot;Adicionar filtro&quot; para comecar.
                    </div>
                  ) : (
                    activeFilters.map((filter) => (
                      <FilterRow
                        key={filter.id}
                        filter={filter}
                        filterDefs={filterDefs}
                        onUpdate={updateFilter}
                        onRemove={removeFilter}
                      />
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={selectedFilterKey}
                    onChange={(event) => setSelectedFilterKey(event.target.value)}
                  >
                    <option value="">Selecionar filtro...</option>
                    {(['geografico', 'comportamental', 'demografico'] as FilterCategory[]).map((category) => (
                      <optgroup key={category} label={CATEGORY_LABELS[category]}>
                        {filterDefs
                          .filter((filterDef) => filterDef.category === category)
                          .map((filterDef) => (
                            <option key={filterDef.key} value={filterDef.key}>
                              {filterDef.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFilter}
                    disabled={!selectedFilterKey}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar filtro
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Save className="h-4 w-4 text-primary" />
                  {segmentBeingEdited ? 'Atualizar Segmento' : 'Salvar Segmento'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      placeholder="Ex: Zona Sul - Apoiadores ativos"
                      value={segmentName}
                      onChange={(event) => handleNameChange(event.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Tag (ex: zona_sul_ativos)"
                        value={segmentTag}
                        onChange={(event) => handleTagChange(event.target.value)}
                        className={cn('flex-1 font-mono text-sm', tagError && 'border-destructive')}
                      />
                    </div>
                    {tagError && (
                      <p className="mt-1 text-xs text-destructive">{tagError}</p>
                    )}
                    {!tagError && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Identificador unico: minusculas, numeros e underscore
                      </p>
                    )}
                  </div>
                  {segmentBeingEdited && (
                    <Button variant="outline" onClick={resetComposer}>
                      Cancelar
                    </Button>
                  )}
                  <Button
                    onClick={saveSegment}
                    disabled={!segmentName.trim() || !hasValidFilters || isSaving || isPreviewLoading || Boolean(tagError)}
                  >
                    {isSaving ? 'Salvando...' : segmentBeingEdited ? 'Salvar alteracoes' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Segmentos Salvos
                  <Badge variant="secondary">{segments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {segments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhum segmento salvo ainda.</p>
                    <p className="text-xs text-muted-foreground">
                      Adicione filtros acima e salve seu primeiro segmento.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tag</TableHead>
                        <TableHead>Resumo</TableHead>
                        <TableHead>Audiencia</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Campanhas</TableHead>
                        <TableHead>Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.map((segment) => {
                        const activeCampaign = segment.campaigns?.find((campaign) => (
                          campaign.status === 'scheduled' || campaign.status === 'sending'
                        ));
                        return (
                          <TableRow key={segment.id}>
                            <TableCell className="font-medium text-sm">{segment.name}</TableCell>
                            <TableCell>
                              {segment.segmentTag ? (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                                  {segment.segmentTag}
                                </code>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                              {summarizeFilters(segment.filters)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {segment.audienceCount?.toLocaleString('pt-BR') ?? '0'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {segment.createdAt
                                ? new Date(segment.createdAt).toLocaleDateString('pt-BR')
                                : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {segment.campaigns && segment.campaigns.length > 0
                                ? segment.campaigns.map((campaign) => campaign.name).join(', ')
                                : 'Sem campanha'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => startEditingSegment(segment)}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => deleteSegment(segment)}
                                  disabled={Boolean(activeCampaign)}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Excluir
                                </Button>
                                <Link href="/campanhas">
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                    Usar em campanha
                                  </Button>
                                </Link>
                              </div>
                              {activeCampaign && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Em uso por {activeCampaign.name}
                                </p>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="h-fit space-y-4 lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Audiencia Estimada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasValidFilters ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Adicione filtros validos para calcular a audiencia.
                    </p>
                  </div>
                ) : isPreviewLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <BarChart3 className="h-8 w-8 animate-pulse text-primary/60" />
                    <p className="text-sm text-muted-foreground">Calculando...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="text-5xl font-bold tabular-nums text-foreground">
                        {(audienceCount ?? 0).toLocaleString('pt-BR')}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">eleitores encontrados</div>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Cobertura</span>
                        <span className="font-medium">
                          {coveragePct !== null ? `${coveragePct}% da base` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Base total</span>
                        <span className="font-medium">{totalVoterCount.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Risco</span>
                        <Badge
                          variant={riskLevel === 'Baixo' ? 'default' : 'secondary'}
                          className={cn(
                            'text-xs',
                            riskLevel === 'Baixo'
                              ? 'border-success/20 bg-success/15 text-success'
                              : 'border-warning/20 bg-warning/15 text-warning',
                          )}
                        >
                          {riskLevel}
                        </Badge>
                      </div>
                    </div>

                    {coveragePct !== null && (
                      <div className="space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${coveragePct}%` }}
                          />
                        </div>
                        <p className="text-right text-[11px] text-muted-foreground">
                          {coveragePct}% da base total
                        </p>
                      </div>
                    )}

                    {riskLevel === 'Medio' && (
                      <div className="flex gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Considere filtrar por opt-in ativo para reduzir risco de bloqueio.</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">Ainda nao importou eleitores?</p>
              <Link href="/segmentacao/importar">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Importar base de eleitores
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
