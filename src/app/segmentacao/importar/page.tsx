'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapeamento' | 'validacao' | 'processamento';

interface VoterField {
  key: string;
  label: string;
  required: boolean;
  aliases: string[]; // keywords for auto-detection
}

// All fields — ordered to match planilha de leads
const VOTER_FIELDS: VoterField[] = [
  {
    key: 'name',
    label: 'Nome',
    required: true,
    aliases: ['nome', 'name', 'beneficiario', 'beneficiário'],
  },
  {
    key: 'phone',
    label: 'Contato / Telefone',
    required: true,
    aliases: ['contato', 'telefone', 'phone', 'celular', 'whatsapp', 'tel'],
  },
  {
    key: 'cpf',
    label: 'CPF',
    required: false,
    aliases: ['cpf'],
  },
  {
    key: 'eventLocation',
    label: 'Local de Realização do Evento',
    required: false,
    aliases: ['local', 'evento', 'local de realização', 'local do evento', 'realização'],
  },
  {
    key: 'eventCep',
    label: 'CEP do Evento',
    required: false,
    aliases: ['cep evento', 'cep do evento', 'cep local'],
  },
  {
    key: 'address',
    label: 'Endereço Individual',
    required: false,
    aliases: ['endereço', 'endereco', 'endereço individual', 'address', 'logradouro'],
  },
  {
    key: 'cep',
    label: 'CEP Individual',
    required: false,
    aliases: ['cep', 'cep individual', 'cep residencial'],
  },
  {
    key: 'projectName',
    label: 'Nome do Projeto',
    required: false,
    aliases: ['projeto', 'nome do projeto', 'project', 'program'],
  },
  {
    key: 'subsecretaria',
    label: 'Subsecretaria Responsável',
    required: false,
    aliases: ['subsecretaria', 'secretaria', 'responsável', 'responsavel', 'órgão', 'orgao'],
  },
  {
    key: 'eventDate',
    label: 'Data do Evento',
    required: false,
    aliases: ['data', 'date', 'data do evento', 'data de realização'],
  },
  {
    key: 'zone',
    label: 'Zona Eleitoral',
    required: false,
    aliases: ['zona', 'zone', 'zona eleitoral'],
  },
  {
    key: 'section',
    label: 'Seção Eleitoral',
    required: false,
    aliases: ['seção', 'secao', 'section', 'sessão'],
  },
  {
    key: 'city',
    label: 'Cidade',
    required: false,
    aliases: ['cidade', 'city', 'municipio', 'município'],
  },
  {
    key: 'neighborhood',
    label: 'Bairro',
    required: false,
    aliases: ['bairro', 'neighborhood', 'distrito'],
  },
];

interface ValidationResult {
  validRows: Record<string, string>[];
  errorRows: { row: Record<string, string>; issues: string[] }[];
  qualityScore: number;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  total: number;
}

// ─── CSV Parser — handles , ; \t separators + quoted fields ──────────────────

function detectSeparator(firstLine: string): string {
  const counts = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of firstLine) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
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
  // Strip BOM
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

// ─── Auto-detect mapping ─────────────────────────────────────────────────────

function autoDetect(headers: string[]): Record<string, string> {
  const detected: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const field of VOTER_FIELDS) {
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const h = header.toLowerCase().trim();
      const isMatch = field.aliases.some(alias =>
        h === alias || h.includes(alias) || alias.includes(h)
      );
      if (isMatch) {
        detected[field.key] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  // Special case: if there are two CEP columns, disambiguate by position
  // The first CEP column → eventCep, second → cep (matches planilha order)
  const cepHeaders = headers.filter(h => h.toLowerCase().trim() === 'cep');
  if (cepHeaders.length >= 2) {
    detected['eventCep'] = cepHeaders[0];
    detected['cep'] = cepHeaders[1];
  }

  return detected;
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload',        label: 'Upload' },
  { id: 'mapeamento',    label: 'Mapeamento' },
  { id: 'validacao',     label: 'Validação' },
  { id: 'processamento', label: 'Processamento' },
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
              <span className={cn(
                'text-[11px] font-medium whitespace-nowrap',
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors',
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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  // Validate: apply mapping, check required fields
  const runValidation = useCallback(() => {
    const validRows: Record<string, string>[] = [];
    const errorRows: { row: Record<string, string>; issues: string[] }[] = [];

    for (const row of rawRows) {
      const mapped: Record<string, string> = {};
      for (const field of VOTER_FIELDS) {
        const srcCol = mapping[field.key];
        if (srcCol) mapped[field.key] = row[srcCol]?.trim() ?? '';
      }

      const issues: string[] = [];
      if (!mapped.name?.trim()) issues.push('Nome obrigatório ausente');
      if (!mapped.phone?.trim()) issues.push('Telefone obrigatório ausente');

      // Skip blank rows (QNT-only or all empty)
      const hasContent = Object.values(mapped).some(v => v.trim());
      if (!hasContent) continue;

      if (issues.length > 0) {
        errorRows.push({ row: mapped, issues });
      } else {
        validRows.push(mapped);
      }
    }

    const total = validRows.length + errorRows.length;
    const qualityScore = total > 0 ? Math.round((validRows.length / total) * 100) : 0;
    setValidationResult({ validRows, errorRows, qualityScore });
    setStep('validacao');
  }, [rawRows, mapping]);

  // Import
  const runImport = useCallback(async () => {
    if (!validationResult) return;
    setIsProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 150);

    try {
      const response = await fetch('/api/voters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validationResult.validRows }),
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
  }, [validationResult]);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setValidationResult(null);
    setImportResult(null);
    setProgress(0);
  };

  const requiredMapped = VOTER_FIELDS
    .filter(f => f.required)
    .every(f => !!mapping[f.key]);

  // Group fields for display
  const requiredFields = VOTER_FIELDS.filter(f => f.required);
  const optionalFields = VOTER_FIELDS.filter(f => !f.required);

  return (
    <SidebarLayout currentPage="segmentacao" pageTitle="Importar Eleitores">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
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
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex h-[300px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Formato: CSV (separado por vírgula, ponto-e-vírgula ou tab)
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground max-w-sm">
                  <Badge variant="destructive" className="text-[10px]">Nome *</Badge>
                  <Badge variant="destructive" className="text-[10px]">Contato *</Badge>
                  <Badge variant="outline" className="text-[10px]">CPF</Badge>
                  <Badge variant="outline" className="text-[10px]">Local do Evento</Badge>
                  <Badge variant="outline" className="text-[10px]">CEP</Badge>
                  <Badge variant="outline" className="text-[10px]">Endereço</Badge>
                  <Badge variant="outline" className="text-[10px]">Projeto</Badge>
                  <Badge variant="outline" className="text-[10px]">Subsecretaria</Badge>
                  <Badge variant="outline" className="text-[10px]">Data</Badge>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />

              {/* Column reference */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-2">Colunas reconhecidas automaticamente:</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span><span className="font-mono text-foreground">NOME</span> → Nome</span>
                  <span><span className="font-mono text-foreground">CONTATO</span> → Telefone</span>
                  <span><span className="font-mono text-foreground">CPF</span> → CPF</span>
                  <span><span className="font-mono text-foreground">LOCAL DE REALIZAÇÃO DO EVENTO</span> → Local</span>
                  <span><span className="font-mono text-foreground">CEP</span> (1º) → CEP do Evento</span>
                  <span><span className="font-mono text-foreground">CEP</span> (2º) → CEP Individual</span>
                  <span><span className="font-mono text-foreground">ENDEREÇO INDIVIDUAL</span> → Endereço</span>
                  <span><span className="font-mono text-foreground">NOME DO PROJETO</span> → Projeto</span>
                  <span><span className="font-mono text-foreground">SUBSECRETARIA RESPONSÁVEL</span> → Subsecretaria</span>
                  <span><span className="font-mono text-foreground">DATA</span> → Data do Evento</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  A coluna <span className="font-mono">QNT</span> é ignorada automaticamente.
                </p>
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
                Mapeie as colunas do arquivo
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {file?.name} — {rawRows.length} linhas • separador: <code className="font-mono text-xs bg-muted px-1 rounded">{separator === '\t' ? 'tab' : separator}</code>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Required fields */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Campos obrigatórios</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo do sistema</TableHead>
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
                            onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          >
                            <option value="">(ignorar)</option>
                            {headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Optional fields */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Campos opcionais</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo do sistema</TableHead>
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
                            onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          >
                            <option value="">(ignorar)</option>
                            {headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
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
                    Primeiras 3 linhas do arquivo
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}
                        </TableRow>
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

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                <Button onClick={runValidation} disabled={!requiredMapped} className="flex-1">
                  Validar dados <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Validação ── */}
        {step === 'validacao' && validationResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className={cn(
                    'text-4xl font-bold',
                    validationResult.qualityScore >= 90 ? 'text-green-600' :
                    validationResult.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {validationResult.qualityScore}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Qualidade</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-semibold">{rawRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total de linhas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-semibold text-green-600">{validationResult.validRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Válidas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-semibold text-red-600">{validationResult.errorRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Com erros</div>
                </CardContent>
              </Card>
            </div>

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
                          {item.issues.map(issue => (
                            <span key={issue} className="text-xs text-red-600">{issue}</span>
                          ))}
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
              <Button variant="outline" onClick={() => setStep('mapeamento')}>Voltar</Button>
              <Button
                onClick={runImport}
                disabled={validationResult.validRows.length === 0}
                className="flex-1"
              >
                Importar {validationResult.validRows.length} registros
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Processamento ── */}
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
                    <Link href="/crm">
                      <Button variant="outline">Ver leads importados</Button>
                    </Link>
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
