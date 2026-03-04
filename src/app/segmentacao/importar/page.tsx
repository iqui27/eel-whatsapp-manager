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
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapeamento' | 'validacao' | 'processamento';

interface VoterField {
  key: string;
  label: string;
  required: boolean;
}

const VOTER_FIELDS: VoterField[] = [
  { key: 'name',         label: 'Nome',             required: true },
  { key: 'phone',        label: 'Telefone',          required: true },
  { key: 'cpf',          label: 'CPF',               required: false },
  { key: 'zone',         label: 'Zona Eleitoral',    required: false },
  { key: 'section',      label: 'Secao',             required: false },
  { key: 'city',         label: 'Cidade',            required: false },
  { key: 'neighborhood', label: 'Bairro',            required: false },
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

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows };
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload',        label: 'Upload' },
  { id: 'mapeamento',    label: 'Mapeamento' },
  { id: 'validacao',     label: 'Validacao' },
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
                done  && 'border-primary bg-primary text-primary-foreground',
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
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-detect mapping: try to match CSV headers to voter field keys/labels
  const autoDetectMapping = useCallback((hdrs: string[]) => {
    const detected: Record<string, string> = {};
    for (const field of VOTER_FIELDS) {
      const match = hdrs.find(h =>
        h.toLowerCase() === field.key.toLowerCase() ||
        h.toLowerCase().includes(field.label.toLowerCase()) ||
        h.toLowerCase().includes(field.key.toLowerCase())
      );
      if (match) detected[field.key] = match;
    }
    return detected;
  }, []);

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: hdrs, rows } = parseCSV(text);
      setHeaders(hdrs);
      setRawRows(rows);
      setMapping(autoDetectMapping(hdrs));
      setStep('mapeamento');
    };
    reader.readAsText(f, 'UTF-8');
  }, [autoDetectMapping]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) handleFileSelected(f);
  }, [handleFileSelected]);

  // Run validation: apply mapping to rawRows
  const runValidation = useCallback(() => {
    const validRows: Record<string, string>[] = [];
    const errorRows: { row: Record<string, string>; issues: string[] }[] = [];

    for (const row of rawRows) {
      const mapped: Record<string, string> = {};
      for (const field of VOTER_FIELDS) {
        const srcCol = mapping[field.key];
        if (srcCol) mapped[field.key] = row[srcCol] ?? '';
      }
      const issues: string[] = [];
      if (!mapped.name?.trim()) issues.push('Nome obrigatorio ausente');
      if (!mapped.phone?.trim()) issues.push('Telefone obrigatorio ausente');
      if (issues.length > 0) {
        errorRows.push({ row: mapped, issues });
      } else {
        validRows.push(mapped);
      }
    }

    const qualityScore = rawRows.length > 0
      ? Math.round((validRows.length / rawRows.length) * 100)
      : 0;

    setValidationResult({ validRows, errorRows, qualityScore });
    setStep('validacao');
  }, [rawRows, mapping]);

  // Run import
  const runImport = useCallback(async () => {
    if (!validationResult) return;
    setIsProcessing(true);
    setProgress(0);

    // Animate progress to 90% while uploading
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

  return (
    <SidebarLayout currentPage="segmentacao" pageTitle="Importar Eleitores">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Importar Eleitores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importe sua base de eleitores em formato CSV
          </p>
        </div>

        <Stepper current={step} />

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <Card>
            <CardContent className="pt-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex h-[360px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors',
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
                    Formato suportado: CSV
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Nome</Badge>
                  <Badge variant="outline">Telefone</Badge>
                  <Badge variant="secondary">Zona</Badge>
                  <Badge variant="secondary">Bairro</Badge>
                  <Badge variant="secondary">CPF</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Campos obrigatorios: <span className="font-medium text-foreground">Nome, Telefone</span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Mapeamento ── */}
        {step === 'mapeamento' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Mapeie as colunas do seu arquivo
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {file?.name} — {rawRows.length} linhas detectadas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo do sistema</TableHead>
                    <TableHead>Coluna no arquivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VOTER_FIELDS.map(field => (
                    <TableRow key={field.key}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{field.label}</span>
                          {field.required ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">obrigatorio</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">opcional</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          value={mapping[field.key] ?? ''}
                          onChange={(e) => setMapping(prev => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))}
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

              {/* Preview first 3 rows */}
              {rawRows.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    Primeiras 3 linhas do arquivo
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rawRows.slice(0, 3).map((row, i) => (
                          <TableRow key={i}>
                            {headers.map(h => (
                              <TableCell key={h} className="text-xs text-muted-foreground">{row[h]}</TableCell>
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
                <Button
                  onClick={runValidation}
                  disabled={!requiredMapped}
                  className="flex-1"
                >
                  Validar dados <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Validacao ── */}
        {step === 'validacao' && validationResult && (
          <div className="space-y-4">
            {/* Quality score */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className={cn(
                    'text-4xl font-bold',
                    validationResult.qualityScore >= 90 ? 'text-success' :
                    validationResult.qualityScore >= 70 ? 'text-warning' : 'text-destructive',
                  )}>
                    {validationResult.qualityScore}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Qualidade da base</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-semibold text-foreground">{rawRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total de linhas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-semibold text-success">{validationResult.validRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Linhas validas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-semibold text-destructive">{validationResult.errorRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Com erros</div>
                </CardContent>
              </Card>
            </div>

            {/* Error rows panel */}
            {validationResult.errorRows.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Linhas com problema ({validationResult.errorRows.length})
                    <Badge variant="secondary" className="text-[10px]">nao serao importadas</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validationResult.errorRows.slice(0, 5).map((item, i) => (
                      <div key={i} className="rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
                        <div className="flex gap-2 flex-wrap">
                          {item.issues.map(issue => (
                            <span key={issue} className="text-xs text-destructive">{issue}</span>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {Object.values(item.row).filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    ))}
                    {validationResult.errorRows.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        + {validationResult.errorRows.length - 5} linhas com erros (nao exibidas)
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
                Iniciar importacao ({validationResult.validRows.length} registros)
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
                  <div className="text-base font-medium text-foreground">Importando eleitores...</div>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progress}% concluido</p>
                  </div>
                </>
              ) : importResult ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Importacao concluida!</h2>
                    <p className="text-sm text-muted-foreground mt-1">Seus eleitores foram adicionados ao sistema</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    <div className="rounded-lg bg-success/10 p-3">
                      <div className="text-2xl font-bold text-success">{importResult.imported}</div>
                      <div className="text-xs text-muted-foreground">Importados</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-2xl font-bold text-muted-foreground">{importResult.duplicates}</div>
                      <div className="text-xs text-muted-foreground">Duplicatas</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-2xl font-bold text-foreground">{importResult.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <Link href="/crm">
                      <Button variant="outline">Ver eleitores importados</Button>
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
