'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  Upload,
  Check,
  AlertTriangle,
  ArrowRight,
  FileText,
  RotateCcw,
  Tag,
  Layers,
  X,
  Plus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapeamento' | 'enriquecimento' | 'validacao' | 'processamento';

interface VoterField {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
}

interface SegmentOption {
  id: string;
  name: string;
  segmentTag: string | null;
  audienceCount: number;
}

// Enrichment options — applied to ALL imported rows
interface EnrichmentOptions {
  tags: string[];                         // tags added to every voter
  segmentMode: 'none' | 'existing' | 'new'; // segment assignment
  segmentId: string;                      // existing segment id
  newSegmentName: string;                 // name for new segment
  optInStatus: 'pending' | 'active' | 'none'; // default opt-in
  crmNotes: string;                       // notes appended to every voter
}

const DEFAULT_ENRICHMENT: EnrichmentOptions = {
  tags: [],
  segmentMode: 'none',
  segmentId: '',
  newSegmentName: '',
  optInStatus: 'pending',
  crmNotes: '',
};

interface ValidationResult {
  validRows: Record<string, string>[];
  errorRows: { row: Record<string, string>; issues: string[] }[];
  qualityScore: number;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  total: number;
  segmentName?: string;
}

// ─── Voter Fields ─────────────────────────────────────────────────────────────

const VOTER_FIELDS: VoterField[] = [
  { key: 'name',         label: 'Nome',                          required: true,  aliases: ['nome', 'name', 'beneficiario', 'beneficiário'] },
  { key: 'phone',        label: 'Contato / Telefone',            required: true,  aliases: ['contato', 'telefone', 'phone', 'celular', 'whatsapp', 'tel'] },
  { key: 'cpf',          label: 'CPF',                           required: false, aliases: ['cpf'] },
  { key: 'eventLocation',label: 'Local de Realização do Evento', required: false, aliases: ['local', 'evento', 'local de realização', 'local do evento', 'realização'] },
  { key: 'eventCep',     label: 'CEP do Evento',                 required: false, aliases: ['cep evento', 'cep do evento', 'cep local'] },
  { key: 'address',      label: 'Endereço Individual',           required: false, aliases: ['endereço', 'endereco', 'endereço individual', 'address', 'logradouro'] },
  { key: 'cep',          label: 'CEP Individual',                required: false, aliases: ['cep', 'cep individual', 'cep residencial'] },
  { key: 'projectName',  label: 'Nome do Projeto',               required: false, aliases: ['projeto', 'nome do projeto', 'project'] },
  { key: 'subsecretaria',label: 'Subsecretaria Responsável',     required: false, aliases: ['subsecretaria', 'secretaria', 'responsável', 'responsavel'] },
  { key: 'eventDate',    label: 'Data do Evento',                required: false, aliases: ['data', 'date', 'data do evento', 'data de realização'] },
  { key: 'zone',         label: 'Zona Eleitoral',                required: false, aliases: ['zona', 'zone', 'zona eleitoral'] },
  { key: 'section',      label: 'Seção Eleitoral',               required: false, aliases: ['seção', 'secao', 'section', 'sessão'] },
  { key: 'city',         label: 'Cidade',                        required: false, aliases: ['cidade', 'city', 'municipio', 'município'] },
  { key: 'neighborhood', label: 'Bairro',                        required: false, aliases: ['bairro', 'neighborhood', 'distrito'] },
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function detectSeparator(firstLine: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[]; separator: string } {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], separator: ',' };
  const separator = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], separator).map(h => h.replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = parseCSVLine(line, separator);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows, separator };
}

function autoDetect(headers: string[]): Record<string, string> {
  const detected: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  for (const field of VOTER_FIELDS) {
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const h = header.toLowerCase().trim();
      const isMatch = field.aliases.some(a => h === a || h.includes(a) || a.includes(h));
      if (isMatch) { detected[field.key] = header; usedHeaders.add(header); break; }
    }
  }
  const cepHeaders = headers.filter(h => h.toLowerCase().trim() === 'cep');
  if (cepHeaders.length >= 2) { detected['eventCep'] = cepHeaders[0]; detected['cep'] = cepHeaders[1]; }
  return detected;
}

// ─── Tag Picker (inline) ──────────────────────────────────────────────────────

function TagPicker({ tags, onChange, suggestions }: {
  tags: string[];
  onChange: (t: string[]) => void;
  suggestions?: string[];
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (val: string) => {
    const v = val.trim().toLowerCase().replace(/\s+/g, '_');
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setInput('');
  };
  const remove = (t: string) => onChange(tags.filter(x => x !== t));

  const filtered = (suggestions ?? [])
    .filter(s => !tags.includes(s) && (input === '' || s.includes(input.toLowerCase())))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] rounded-md border border-input bg-background px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            {t}
            <button type="button" onClick={e => { e.stopPropagation(); remove(t); }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
            if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]);
          }}
          onBlur={() => { if (input.trim()) add(input); }}
          placeholder={tags.length === 0 ? 'Digite e pressione Enter ou vírgula...' : ''}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Tag className="h-2.5 w-2.5" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload',         label: 'Upload' },
  { id: 'mapeamento',     label: 'Mapeamento' },
  { id: 'enriquecimento', label: 'Enriquecimento' },
  { id: 'validacao',      label: 'Validação' },
  { id: 'processamento',  label: 'Processamento' },
];

function Stepper({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex items-center gap-0 w-full mb-8">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors',
                done   && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary bg-primary/10 text-primary',
                !done && !active && 'border-border bg-background text-muted-foreground',
              )}>
                {done ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={cn('text-[11px] font-medium whitespace-nowrap',
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors',
                idx < currentIdx ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportarPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [separator, setSeparator] = useState(',');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [enrichment, setEnrichment] = useState<EnrichmentOptions>(DEFAULT_ENRICHMENT);
  const [availableSegments, setAvailableSegments] = useState<SegmentOption[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Load segments + existing tags when entering enrichment step
  useEffect(() => {
    if (step !== 'enriquecimento') return;
    fetch('/api/segments')
      .then(r => r.ok ? r.json() : [])
      .then((data: SegmentOption[]) => setAvailableSegments(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch('/api/segments?action=filter-options')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tags) setAvailableTags(d.tags); })
      .catch(() => {});
  }, [step]);

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: hdrs, rows, separator: sep } = parseCSV(text);
      setHeaders(hdrs);
      setRawRows(rows);
      setSeparator(sep);
      setMapping(autoDetect(hdrs));
      setStep('mapeamento');
    };
    reader.readAsText(f, 'UTF-8');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv') || f?.name.endsWith('.txt')) handleFileSelected(f);
  }, [handleFileSelected]);

  const runValidation = useCallback(() => {
    const validRows: Record<string, string>[] = [];
    const errorRows: { row: Record<string, string>; issues: string[] }[] = [];
    for (const row of rawRows) {
      const mapped: Record<string, string> = {};
      for (const field of VOTER_FIELDS) {
        const srcCol = mapping[field.key];
        if (srcCol) mapped[field.key] = row[srcCol]?.trim() ?? '';
      }
      const hasContent = Object.values(mapped).some(v => v.trim());
      if (!hasContent) continue;
      const issues: string[] = [];
      if (!mapped.name?.trim()) issues.push('Nome obrigatório ausente');
      if (!mapped.phone?.trim()) issues.push('Telefone obrigatório ausente');
      if (issues.length > 0) errorRows.push({ row: mapped, issues });
      else validRows.push(mapped);
    }
    const total = validRows.length + errorRows.length;
    setValidationResult({
      validRows,
      errorRows,
      qualityScore: total > 0 ? Math.round((validRows.length / total) * 100) : 0,
    });
    setStep('validacao');
  }, [rawRows, mapping]);

  const runImport = useCallback(async () => {
    if (!validationResult) return;
    setIsProcessing(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 150);
    try {
      const response = await fetch('/api/voters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validationResult.validRows, enrichment }),
      });
      clearInterval(interval);
      setProgress(100);
      if (response.ok) {
        const result = await response.json() as ImportResult;
        setImportResult(result);
      } else {
        setImportResult({ imported: 0, duplicates: 0, total: validationResult.validRows.length });
      }
    } catch {
      clearInterval(interval);
      setProgress(100);
      setImportResult({ imported: 0, duplicates: 0, total: validationResult.validRows.length });
    } finally {
      setIsProcessing(false);
      setStep('processamento');
    }
  }, [validationResult, enrichment]);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setEnrichment(DEFAULT_ENRICHMENT);
    setValidationResult(null);
    setImportResult(null);
    setProgress(0);
  };

  const requiredMapped = VOTER_FIELDS.filter(f => f.required).every(f => !!mapping[f.key]);
  const enrichmentValid =
    enrichment.segmentMode !== 'new' || enrichment.newSegmentName.trim().length >= 2;
  const requiredFields = VOTER_FIELDS.filter(f => f.required);
  const optionalFields = VOTER_FIELDS.filter(f => !f.required);

  return (
    <SidebarLayout currentPage="segmentacao" pageTitle="Importar Eleitores">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Importar Leads / Eleitores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importe planilhas de leads em CSV — suporte a vírgula, ponto-e-vírgula e tabulação
          </p>
        </div>

        <Stepper current={step} />

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium">Clique para selecionar ou arraste o arquivo</p>
                  <p className="mt-1 text-sm text-muted-foreground">CSV (vírgula, ponto-e-vírgula ou tab)</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
                  <Badge variant="destructive" className="text-[10px]">Nome *</Badge>
                  <Badge variant="destructive" className="text-[10px]">Contato *</Badge>
                  {['CPF','Local Evento','CEP','Endereço','Projeto','Subsecretaria','Data'].map(l => (
                    <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                  ))}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
              />
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-2">Colunas reconhecidas automaticamente:</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted-foreground">
                  {[
                    ['NOME', 'Nome'], ['CONTATO', 'Telefone'], ['CPF', 'CPF'],
                    ['LOCAL DE REALIZAÇÃO DO EVENTO', 'Local'], ['CEP (1º)', 'CEP do Evento'],
                    ['CEP (2º)', 'CEP Individual'], ['ENDEREÇO INDIVIDUAL', 'Endereço'],
                    ['NOME DO PROJETO', 'Projeto'], ['SUBSECRETARIA RESPONSÁVEL', 'Subsecretaria'],
                    ['DATA', 'Data do Evento'], ['QNT', '(ignorada)'],
                  ].map(([col, field]) => (
                    <span key={col}><span className="font-mono text-foreground">{col}</span> → {field}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Mapeamento ── */}
        {step === 'mapeamento' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Mapeie as colunas
              </CardTitle>
              <CardDescription>
                {file?.name} — {rawRows.length} linhas • separador:{' '}
                <code className="font-mono text-xs bg-muted px-1 rounded">
                  {separator === '\t' ? 'tab' : separator}
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Required */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Obrigatórios</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Coluna no arquivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requiredFields.map(field => (
                      <TableRow key={field.key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{field.label}</span>
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">obrigatório</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            value={mapping[field.key] ?? ''}
                            onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          >
                            <option value="">(ignorar)</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Optional */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Opcionais</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Coluna no arquivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optionalFields.map(field => (
                      <TableRow key={field.key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{field.label}</span>
                            {mapping[field.key] && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">detectado</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            value={mapping[field.key] ?? ''}
                            onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          >
                            <option value="">(ignorar)</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Preview */}
              {rawRows.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    Primeiras 3 linhas
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>{headers.map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {rawRows.slice(0, 3).map((row, i) => (
                          <TableRow key={i}>
                            {headers.map(h => (
                              <TableCell key={h} className="text-xs text-muted-foreground whitespace-nowrap">{row[h]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                <Button onClick={() => setStep('enriquecimento')} disabled={!requiredMapped} className="flex-1">
                  Próximo: Enriquecimento <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Enriquecimento ── */}
        {step === 'enriquecimento' && (
          <div className="space-y-4">
            {/* Header card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Enriquecimento da importação</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estas configurações serão aplicadas a <strong>todos os {rawRows.length} registros</strong> da planilha.
                      Tags e segmentos permitem segmentação imediata após a importação.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Tags globais
                </CardTitle>
                <CardDescription>
                  Adicione tags que identificam esta importação — ex: <code className="text-xs font-mono">evento_marco_2025</code>, <code className="text-xs font-mono">zona_sul</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TagPicker
                  tags={enrichment.tags}
                  onChange={tags => setEnrichment(e => ({ ...e, tags }))}
                  suggestions={availableTags}
                />
              </CardContent>
            </Card>

            {/* Segmento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Segmento de destino
                </CardTitle>
                <CardDescription>
                  Associe todos os leads desta importação a um segmento para segmentação de campanhas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Mode selector */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'none',     label: 'Nenhum',          desc: 'Sem segmento' },
                    { value: 'existing', label: 'Segmento existente', desc: 'Adicionar a um já criado' },
                    { value: 'new',      label: 'Criar novo',       desc: 'Novo segmento agora' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEnrichment(e => ({ ...e, segmentMode: opt.value }))}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-left transition-colors',
                        enrichment.segmentMode === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <p className="font-medium text-xs">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Existing segment picker */}
                {enrichment.segmentMode === 'existing' && (
                  <div className="space-y-2">
                    {availableSegments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum segmento encontrado.{' '}
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => setEnrichment(e => ({ ...e, segmentMode: 'new' }))}
                        >
                          Criar um novo
                        </button>
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                        {availableSegments.map(seg => (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => setEnrichment(e => ({ ...e, segmentId: seg.id }))}
                            className={cn(
                              'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                              enrichment.segmentId === seg.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/50',
                            )}
                          >
                            <div>
                              <p className="font-medium text-sm">{seg.name}</p>
                              {seg.segmentTag && (
                                <code className="text-[10px] text-muted-foreground font-mono">{seg.segmentTag}</code>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {seg.audienceCount} eleitores
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* New segment form */}
                {enrichment.segmentMode === 'new' && (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Nome do segmento
                      </label>
                      <Input
                        value={enrichment.newSegmentName}
                        onChange={e => setEnrichment(en => ({ ...en, newSegmentName: e.target.value }))}
                        placeholder="Ex: Evento Março 2025 — Zona Sul"
                      />
                      {enrichment.newSegmentName.trim().length >= 2 && (
                        <p className="text-xs text-muted-foreground">
                          Tag gerada:{' '}
                          <code className="font-mono text-foreground">
                            {enrichment.newSegmentName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_').substring(0, 50)}
                          </code>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      O segmento será criado automaticamente e todos os leads serão associados a ele.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opt-in padrão */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status de opt-in padrão</CardTitle>
                <CardDescription>Status inicial de consentimento para todos os registros importados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'pending', label: 'Pendente',   desc: 'Aguardando confirmação' },
                    { value: 'active',  label: 'Ativo',      desc: 'Já consentiu' },
                    { value: 'none',    label: 'Não definir', desc: 'Manter campo vazio' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEnrichment(e => ({ ...e, optInStatus: opt.value }))}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-left transition-colors',
                        enrichment.optInStatus === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <p className="font-medium text-xs">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notas CRM */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nota CRM global</CardTitle>
                <CardDescription>
                  Texto adicionado ao campo de notas de todos os registros — útil para identificar a origem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  rows={3}
                  value={enrichment.crmNotes}
                  onChange={e => setEnrichment(en => ({ ...en, crmNotes: e.target.value }))}
                  placeholder={`Ex: Importado da planilha "${file?.name}" em ${new Date().toLocaleDateString('pt-BR')}`}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
                />
              </CardContent>
            </Card>

            {/* Resumo */}
            {(enrichment.tags.length > 0 || enrichment.segmentMode !== 'none' || enrichment.crmNotes) && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">Resumo do enriquecimento:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {enrichment.tags.length > 0 && (
                    <p>• Tags: <span className="text-foreground font-medium">{enrichment.tags.join(', ')}</span></p>
                  )}
                  {enrichment.segmentMode === 'existing' && enrichment.segmentId && (
                    <p>• Segmento: <span className="text-foreground font-medium">
                      {availableSegments.find(s => s.id === enrichment.segmentId)?.name ?? '—'}
                    </span></p>
                  )}
                  {enrichment.segmentMode === 'new' && enrichment.newSegmentName && (
                    <p>• Novo segmento: <span className="text-foreground font-medium">{enrichment.newSegmentName}</span></p>
                  )}
                  {enrichment.optInStatus !== 'none' && (
                    <p>• Opt-in: <span className="text-foreground font-medium capitalize">{enrichment.optInStatus}</span></p>
                  )}
                  {enrichment.crmNotes && (
                    <p>• Nota CRM: <span className="text-foreground font-medium truncate">{enrichment.crmNotes.slice(0, 60)}{enrichment.crmNotes.length > 60 ? '…' : ''}</span></p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('mapeamento')}>Voltar</Button>
              <Button onClick={runValidation} disabled={!enrichmentValid} className="flex-1">
                Validar dados <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Validação ── */}
        {step === 'validacao' && validationResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className={cn('text-4xl font-bold',
                    validationResult.qualityScore >= 90 ? 'text-green-600' :
                    validationResult.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600',
                  )}>{validationResult.qualityScore}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Qualidade</div>
                </CardContent>
              </Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-semibold">{rawRows.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Total de linhas</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-semibold text-green-600">{validationResult.validRows.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Válidas</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-semibold text-red-600">{validationResult.errorRows.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Com erros</div>
              </CardContent></Card>
            </div>

            {/* Enrichment summary in validation */}
            {(enrichment.tags.length > 0 || enrichment.segmentMode !== 'none') && (
              <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Enriquecimento:</span>
                {enrichment.tags.map(t => (
                  <span key={t} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">{t}</span>
                ))}
                {enrichment.segmentMode === 'existing' && enrichment.segmentId && (
                  <span className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5">
                    <Layers className="h-2.5 w-2.5" />
                    {availableSegments.find(s => s.id === enrichment.segmentId)?.name}
                  </span>
                )}
                {enrichment.segmentMode === 'new' && (
                  <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 text-primary px-2 py-0.5">
                    <Plus className="h-2.5 w-2.5" />
                    {enrichment.newSegmentName}
                  </span>
                )}
              </div>
            )}

            {validationResult.errorRows.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Linhas com problema ({validationResult.errorRows.length})
                    <Badge variant="secondary" className="text-[10px]">não serão importadas</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validationResult.errorRows.slice(0, 5).map((item, i) => (
                      <div key={i} className="rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2">
                        <div className="flex gap-2 flex-wrap">
                          {item.issues.map(issue => <span key={issue} className="text-xs text-red-600">{issue}</span>)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {Object.values(item.row).filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    ))}
                    {validationResult.errorRows.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        + {validationResult.errorRows.length - 5} linhas com erros (não exibidas)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('enriquecimento')}>Voltar</Button>
              <Button onClick={runImport} disabled={validationResult.validRows.length === 0} className="flex-1">
                Importar {validationResult.validRows.length} registros
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Processamento ── */}
        {step === 'processamento' && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              {isProcessing ? (
                <>
                  <div className="text-base font-medium">Importando...</div>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progress}% concluído</p>
                  </div>
                </>
              ) : importResult ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Importação concluída!</h2>
                    <p className="text-sm text-muted-foreground mt-1">Seus leads foram adicionados ao sistema</p>
                    {importResult.segmentName && (
                      <p className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        Segmento &quot;{importResult.segmentName}&quot; criado e associado
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                      <div className="text-xs text-muted-foreground">Importados</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-2xl font-bold text-muted-foreground">{importResult.duplicates}</div>
                      <div className="text-xs text-muted-foreground">Duplicatas</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-2xl font-bold">{importResult.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <Link href="/crm"><Button variant="outline">Ver leads importados</Button></Link>
                    {importResult.segmentName && (
                      <Link href="/segmentacao"><Button variant="outline">Ver segmentos</Button></Link>
                    )}
                    <Button onClick={reset}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Importar mais
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
