'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2,
} from 'lucide-react';
import {
  loadWizardState,
  saveWizardState,
  type WizardState,
  validateStep,
  markStepCompleted,
  getNextStep,
} from '@/lib/setup-wizard';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'mapping' | 'validation' | 'processing';

interface VoterField {
  key: string;
  label: string;
  required: boolean;
}

const VOTER_FIELDS: VoterField[] = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'phone', label: 'Telefone', required: true },
  { key: 'cpf', label: 'CPF', required: false },
  { key: 'zone', label: 'Zona Eleitoral', required: false },
  { key: 'section', label: 'Seção', required: false },
  { key: 'city', label: 'Cidade', required: false },
  { key: 'neighborhood', label: 'Bairro', required: false },
  { key: 'tags', label: 'Tags', required: false },
];

interface ValidationResult {
  validRows: Record<string, string>[];
  errorRows: { row: Record<string, string>; issues: string[] }[];
  qualityScore: number;
  detectedTags: string[];
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

const STEPS: { id: ImportStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'mapping', label: 'Mapeamento' },
  { id: 'validation', label: 'Validação' },
  { id: 'processing', label: 'Processamento' },
];

function ImportStepper({ current }: { current: ImportStep }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);
  
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors',
                done && 'border-primary bg-primary text-primary-foreground',
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

export default function WizardImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Load state
  useEffect(() => {
    const loaded = loadWizardState();
    setState(loaded);
    setLoading(false);
  }, []);
  
  // Save state when it changes
  useEffect(() => {
    if (state) {
      saveWizardState(state);
    }
  }, [state]);
  
  // Auto-detect mapping
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
      setStep('mapping');
    };
    reader.readAsText(f, 'UTF-8');
  }, [autoDetectMapping]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) handleFileSelected(f);
  }, [handleFileSelected]);
  
  // Run validation
  const runValidation = useCallback(() => {
    const validRows: Record<string, string>[] = [];
    const errorRows: { row: Record<string, string>; issues: string[] }[] = [];
    const tagSet = new Set<string>();
    
    for (const row of rawRows) {
      const mapped: Record<string, string> = {};
      for (const field of VOTER_FIELDS) {
        const srcCol = mapping[field.key];
        if (srcCol) mapped[field.key] = row[srcCol] ?? '';
      }
      
      const issues: string[] = [];
      if (!mapped.name?.trim()) issues.push('Nome obrigatório ausente');
      if (!mapped.phone?.trim()) issues.push('Telefone obrigatório ausente');
      
      if (issues.length > 0) {
        errorRows.push({ row: mapped, issues });
      } else {
        validRows.push(mapped);
        
        // Extract tags
        if (mapped.tags) {
          mapped.tags.split(/[;,]/).forEach(t => {
            const tag = t.trim().toLowerCase().replace(/\s+/g, '_');
            if (tag) tagSet.add(tag);
          });
        }
      }
    }
    
    const qualityScore = rawRows.length > 0
      ? Math.round((validRows.length / rawRows.length) * 100)
      : 0;
    
    setValidationResult({
      validRows,
      errorRows,
      qualityScore,
      detectedTags: Array.from(tagSet),
    });
    setStep('validation');
  }, [rawRows, mapping]);
  
  // Run import
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
        const result: ImportResult = await response.json();
        setImportResult(result);
        
        // Update wizard state
        setState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            import: {
              fileId: null,
              fileName: file?.name || null,
              totalRows: validationResult.validRows.length,
              importedRows: result.imported,
              duplicates: result.duplicates,
              tags: validationResult.detectedTags,
              completed: true,
            },
          };
        });
      } else {
        setImportResult({ imported: 0, duplicates: 0, total: validationResult.validRows.length });
        toast.error('Erro na importação');
      }
    } catch (err) {
      clearInterval(interval);
      setProgress(100);
      setImportResult({ imported: 0, duplicates: 0, total: validationResult.validRows.length });
      toast.error('Erro na importação');
    } finally {
      setIsProcessing(false);
      setStep('processing');
    }
  }, [validationResult, file]);
  
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
  
  const handleContinue = () => {
    if (!state) return;
    
    const validation = validateStep(state, 'import');
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    const newState = markStepCompleted(state, 'import');
    setState(newState);
    
    const nextStep = getNextStep('import');
    if (nextStep) {
      router.push(`/wizard/${nextStep}`);
    }
  };
  
  const requiredMapped = VOTER_FIELDS
    .filter(f => f.required)
    .every(f => !!mapping[f.key]);
  
  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Show completed state if already imported
  if (state.import.completed && step === 'upload') {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Importar Eleitores
          </h2>
        </div>
        
        <Card className="border-green-500/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Check className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold">Importação Concluída</h3>
              <p className="text-muted-foreground">
                {state.import.importedRows} eleitores importados de {state.import.fileName}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Importar Outro Arquivo
                </Button>
                <Button onClick={handleContinue}>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Importar Eleitores
        </h2>
        <p className="text-muted-foreground">
          Importe sua base de eleitores em formato CSV com detecção automática de colunas.
        </p>
      </div>
      
      <ImportStepper current={step} />
      
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
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
                  Formato suportado: CSV
                </p>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Nome</Badge>
                <Badge variant="outline">Telefone</Badge>
                <Badge variant="secondary">Zona</Badge>
                <Badge variant="secondary">Bairro</Badge>
                <Badge variant="secondary">Tags</Badge>
              </div>
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
      
      {/* Step 2: Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Mapeie as Colunas
            </CardTitle>
            <CardDescription>
              {file?.name} — {rawRows.length} linhas detectadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo do Sistema</TableHead>
                  <TableHead>Coluna no Arquivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {VOTER_FIELDS.map(field => (
                  <TableRow key={field.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{field.label}</span>
                        {field.required ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">obrigatório</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">opcional</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
      
      {/* Step 3: Validation */}
      {step === 'validation' && validationResult && (
        <div className="space-y-4">
          {/* Quality score */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <div className={cn(
                  'text-3xl font-bold',
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
                <div className="text-xs text-muted-foreground mt-1">Total</div>
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
          
          {/* Detected tags */}
          {validationResult.detectedTags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tags Detectadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {validationResult.detectedTags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
            <Button
              onClick={runImport}
              disabled={validationResult.validRows.length === 0}
              className="flex-1"
            >
              Importar ({validationResult.validRows.length} registros)
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Step 4: Processing */}
      {step === 'processing' && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {isProcessing ? (
              <>
                <div className="text-base font-medium">Importando eleitores...</div>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{progress}% concluído</p>
                </div>
              </>
            ) : importResult ? (
              <>
                <Check className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold">Importação Concluída!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Eleitores adicionados ao sistema</p>
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-3">
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <div className="text-xs text-muted-foreground">Importados</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-2xl font-bold">{importResult.duplicates}</div>
                    <div className="text-xs text-muted-foreground">Duplicatas</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-2xl font-bold">{importResult.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
                <Button onClick={handleContinue}>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
      
      {/* Navigation */}
      {step !== 'processing' && (
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={() => router.push('/wizard/chips')}>
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}