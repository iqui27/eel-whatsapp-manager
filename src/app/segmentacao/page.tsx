'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Plus,
  X,
  Users,
  Filter,
  Save,
  Upload,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Segment } from '@/db/schema';

// ─── Filter Definitions ───────────────────────────────────────────────────────

type FilterType = 'select' | 'multiselect' | 'number';
type FilterCategory = 'geografico' | 'comportamental' | 'demografico';

interface FilterDef {
  key: string;
  label: string;
  category: FilterCategory;
  type: FilterType;
  options?: string[];
}

const FILTER_DEFS: FilterDef[] = [
  // Geografico
  { key: 'zone',         label: 'Zona Eleitoral',             category: 'geografico',     type: 'select',      options: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'] },
  { key: 'city',         label: 'Cidade',                     category: 'geografico',     type: 'select',      options: ['Sao Paulo', 'Campinas', 'Santos', 'Ribeirao Preto'] },
  { key: 'neighborhood', label: 'Bairro',                     category: 'geografico',     type: 'select',      options: ['Centro', 'Norte', 'Sul', 'Leste', 'Oeste'] },
  // Comportamental
  { key: 'optInStatus',      label: 'Status de Opt-in',           category: 'comportamental', type: 'select',      options: ['active', 'pending', 'expired', 'revoked'] },
  { key: 'engagementScore',  label: 'Score de Engajamento (min)',  category: 'comportamental', type: 'number' },
  // Demografico
  { key: 'tags',         label: 'Tags',                       category: 'demografico',    type: 'multiselect', options: ['apoiador', 'indeciso', 'opositor', 'zona-sul', 'zona-norte', 'primeira-vez', 'lideranca'] },
];

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveFilter {
  id: string;
  key: string;
  value: string | string[];
}

// ─── Filter Row Component ─────────────────────────────────────────────────────

function FilterRow({
  filter,
  onUpdate,
  onRemove,
}: {
  filter: ActiveFilter;
  onUpdate: (id: string, value: string | string[]) => void;
  onRemove: (id: string) => void;
}) {
  const def = FILTER_DEFS.find(d => d.key === filter.key);
  if (!def) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">{def.label}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', CATEGORY_COLORS[def.category])}>
            {CATEGORY_LABELS[def.category]}
          </span>
        </div>
        {def.type === 'select' && def.options && (
          <select
            className="w-full max-w-[280px] rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={filter.value as string}
            onChange={e => onUpdate(filter.id, e.target.value)}
          >
            <option value="">Selecionar...</option>
            {def.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {def.type === 'number' && (
          <input
            type="number"
            min={0}
            max={100}
            className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={filter.value as string}
            placeholder="0–100"
            onChange={e => onUpdate(filter.id, e.target.value)}
          />
        )}
        {def.type === 'multiselect' && def.options && (
          <div className="flex flex-wrap gap-1.5">
            {def.options.map(opt => {
              const vals = filter.value as string[];
              const selected = vals.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const current = vals;
                    const next = selected ? current.filter(v => v !== opt) : [...current, opt];
                    onUpdate(filter.id, next);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50',
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(filter.id)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SegmentacaoPage() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [segmentName, setSegmentName] = useState('');
  const [selectedFilterKey, setSelectedFilterKey] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved segments
  const loadSegments = useCallback(async () => {
    try {
      const res = await fetch('/api/segments');
      if (res.ok) setSegments(await res.json());
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  const addFilter = () => {
    if (!selectedFilterKey) return;
    const def = FILTER_DEFS.find(d => d.key === selectedFilterKey);
    if (!def) return;
    const defaultValue = def.type === 'multiselect' ? [] : '';
    setActiveFilters(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      key: selectedFilterKey,
      value: defaultValue,
    }]);
    setSelectedFilterKey('');
    setAudienceCount(null);
  };

  const updateFilter = (id: string, value: string | string[]) => {
    setActiveFilters(prev => prev.map(f => f.id === id ? { ...f, value } : f));
    setAudienceCount(null);
  };

  const removeFilter = (id: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
    setAudienceCount(null);
  };

  // Mock audience count (real server-side filtering deferred to Phase 05)
  const calculateAudience = () => {
    const mockBase = 1000;
    const reduction = activeFilters.length * 150;
    const jitter = Math.floor(Math.random() * 80) - 40;
    setAudienceCount(Math.max(0, mockBase - reduction + jitter));
  };

  const saveSegment = async () => {
    if (!segmentName.trim() || activeFilters.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName.trim(),
          filters: JSON.stringify(activeFilters),
          audienceCount: audienceCount ?? 0,
        }),
      });
      if (res.ok) {
        toast.success('Segmento salvo com sucesso!');
        setSegmentName('');
        setActiveFilters([]);
        setAudienceCount(null);
        await loadSegments();
      } else {
        toast.error('Erro ao salvar segmento');
      }
    } catch {
      toast.error('Erro ao salvar segmento');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine risk level for preview
  const riskLevel = activeFilters.some(f => f.key === 'optInStatus' && f.value === 'active')
    ? 'Baixo'
    : 'Medio';

  const coveragePct = audienceCount !== null
    ? Math.min(100, Math.round((audienceCount / 1000) * 100))
    : null;

  return (
    <SidebarLayout currentPage="segmentacao" pageTitle="Segmentacao">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Segmentacao</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie segmentos de audiencia com filtros combinados
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
          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Filter Builder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-primary" />
                  Construtor de Segmento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Logic toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">Logica:</span>
                  <div className="flex rounded-lg border border-border overflow-hidden">
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
                        'px-3 py-1.5 text-sm font-medium transition-colors border-l border-border',
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

                {/* Active filters */}
                <div className="space-y-2 min-h-[48px]">
                  {activeFilters.length === 0 ? (
                    <div className="flex items-center justify-center h-12 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      Nenhum filtro adicionado. Clique em &quot;Adicionar filtro&quot; para comecar.
                    </div>
                  ) : (
                    activeFilters.map(f => (
                      <FilterRow key={f.id} filter={f} onUpdate={updateFilter} onRemove={removeFilter} />
                    ))
                  )}
                </div>

                {/* Add filter row */}
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={selectedFilterKey}
                    onChange={e => setSelectedFilterKey(e.target.value)}
                  >
                    <option value="">Selecionar filtro...</option>
                    {(['geografico', 'comportamental', 'demografico'] as FilterCategory[]).map(cat => (
                      <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                        {FILTER_DEFS.filter(d => d.category === cat).map(d => (
                          <option key={d.key} value={d.key}>{d.label}</option>
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

                {/* Calculate button */}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={calculateAudience}
                  disabled={activeFilters.length === 0}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Calcular audiencia
                </Button>
              </CardContent>
            </Card>

            {/* Save segment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Save className="h-4 w-4 text-primary" />
                  Salvar Segmento
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input
                  placeholder="Ex: Zona Sul - Apoiadores ativos"
                  value={segmentName}
                  onChange={e => setSegmentName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={saveSegment}
                  disabled={!segmentName.trim() || activeFilters.length === 0 || isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardContent>
            </Card>

            {/* Saved segments list */}
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
                        <TableHead>Filtros</TableHead>
                        <TableHead>Audiencia</TableHead>
                        <TableHead>Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.map(seg => {
                        let filterCount = 0;
                        try {
                          const parsed = JSON.parse(seg.filters);
                          filterCount = Array.isArray(parsed) ? parsed.length : 0;
                        } catch { /* ignore */ }
                        return (
                          <TableRow key={seg.id}>
                            <TableCell className="font-medium text-sm">{seg.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{filterCount} filtros</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {seg.audienceCount ? `~${seg.audienceCount}` : '—'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Link href="/campanhas">
                                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                                  Usar em campanha
                                </Button>
                              </Link>
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

          {/* ── Right column — Audience Preview (sticky) ── */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Audiencia Estimada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {audienceCount === null ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Adicione filtros e clique em<br />&quot;Calcular audiencia&quot;
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-foreground tabular-nums">
                        {audienceCount.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">eleitores (estimado)</div>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Cobertura</span>
                        <span className="font-medium">~{coveragePct}% da base</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Risco</span>
                        <Badge
                          variant={riskLevel === 'Baixo' ? 'default' : 'secondary'}
                          className={cn(
                            'text-xs',
                            riskLevel === 'Baixo' ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20',
                          )}
                        >
                          {riskLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Opt-in ativo</span>
                        <span className="font-medium">
                          {activeFilters.some(f => f.key === 'optInStatus' && f.value === 'active')
                            ? '100%' : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Coverage bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${coveragePct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground text-right">{coveragePct}% da base total</p>
                    </div>

                    {riskLevel === 'Medio' && (
                      <div className="flex gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3 text-xs text-warning">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Considere filtrar por opt-in ativo para reduzir risco de bloqueio.</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Import shortcut */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-2">
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
