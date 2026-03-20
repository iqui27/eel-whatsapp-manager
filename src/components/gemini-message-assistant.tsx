'use client';

import { useState, useCallback } from 'react';
import { Wand2, ChevronDown, ChevronUp, RotateCcw, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeminiMessageAssistantProps {
  currentMessage: string;
  onInsertMessage: (text: string) => void;
  candidateName?: string;
  segmentDescription?: string;
  className?: string;
}

type Tone = 'formal' | 'informal' | 'friendly' | 'urgent';
type RewriteStyle = 'shorter' | 'longer' | 'more_formal' | 'more_casual' | 'more_persuasive';

interface GenerationEntry {
  text: string;
  id: number;
}

const TONE_LABELS: Record<Tone, string> = {
  formal: 'Formal',
  informal: 'Informal',
  friendly: 'Amigável',
  urgent: 'Urgente',
};

const STYLE_LABELS: Record<RewriteStyle, string> = {
  shorter: 'Mais curta',
  longer: 'Mais longa',
  more_formal: 'Mais formal',
  more_casual: 'Mais casual',
  more_persuasive: 'Mais persuasiva',
};

const IMPROVE_QUICK_ACTIONS = [
  { label: 'Mais persuasivo', instruction: 'Torne mais persuasivo com apelo emocional' },
  { label: 'Mais curto', instruction: 'Torne mais concisa e direta' },
  { label: 'Corrigir gramática', instruction: 'Corrija erros gramaticais e melhore a escrita' },
  { label: 'Adicionar urgência', instruction: 'Adicione senso de urgência' },
];

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 shrink-0 font-medium underline-offset-2 hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  text,
  onUse,
  label = 'Usar esta mensagem',
  secondary,
}: {
  text: string;
  onUse: (text: string) => void;
  label?: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[#E8E4DC] bg-[#FDFCFA] p-3 space-y-2">
      <p className="text-sm text-[#2D2A24] whitespace-pre-wrap leading-relaxed">{text}</p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onUse(text)}
          className="h-7 gap-1.5 bg-[#2D2A24] text-white hover:bg-[#1a1815] text-xs"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {label}
        </Button>
        {secondary}
      </div>
    </div>
  );
}

// ─── History Pills ────────────────────────────────────────────────────────────

function HistoryPills({
  history,
  onSelect,
}: {
  history: GenerationEntry[];
  onSelect: (text: string) => void;
}) {
  if (history.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-[#8A8278]">Gerações anteriores</p>
      <div className="flex flex-wrap gap-1.5">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.text)}
            className="rounded-full border border-[#E8E4DC] bg-white px-2.5 py-0.5 text-xs text-[#4A4540] hover:border-[#B8B0A4] hover:bg-[#F8F6F1] transition-colors"
          >
            <Clock className="mr-1 inline h-3 w-3" />
            Geração {entry.id}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 py-1">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

// ─── Generate Tab ─────────────────────────────────────────────────────────────

function GenerateTab({
  candidateName,
  segmentDescription,
  onInsert,
}: {
  candidateName?: string;
  segmentDescription?: string;
  onInsert: (text: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<Tone>('informal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; suggestions: string[] } | null>(null);
  const [history, setHistory] = useState<GenerationEntry[]>([]);
  const [historyCounter, setHistoryCounter] = useState(1);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt,
          tone,
          candidateName,
          segmentDescription,
          includeVariables: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar mensagem');
        return;
      }
      const newResult = data.result as { message: string; suggestions: string[] };
      setResult(newResult);
      if (newResult.message) {
        setHistory((prev) => {
          const next = [{ text: newResult.message, id: historyCounter }, ...prev].slice(0, 3);
          return next;
        });
        setHistoryCounter((c) => c + 1);
      }
    } catch {
      setError('Erro de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [prompt, tone, candidateName, segmentDescription, historyCounter]);

  return (
    <div className="space-y-3 pt-2">
      <Textarea
        placeholder="Descreva a mensagem que deseja criar... ex: Convite para reunião no Centro na próxima quinta-feira"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[72px] resize-none border-[#E8E4DC] bg-white text-sm placeholder:text-[#B8B0A4] focus-visible:ring-1 focus-visible:ring-[#C8BFB4]"
      />

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
              tone === t
                ? 'bg-[#2D2A24] text-white'
                : 'border border-[#E8E4DC] bg-white text-[#4A4540] hover:border-[#B8B0A4]'
            }`}
          >
            {TONE_LABELS[t]}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        disabled={loading || !prompt.trim()}
        onClick={handleGenerate}
        className="h-8 w-full gap-2 bg-[#2D2A24] text-white hover:bg-[#1a1815] text-xs disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Wand2 className="h-3.5 w-3.5" />
            Gerar mensagem
          </>
        )}
      </Button>

      {error && <ErrorBanner message={error} onRetry={handleGenerate} />}

      {loading && <LoadingSkeleton />}

      {!loading && result && (
        <div className="space-y-2">
          <ResultCard
            text={result.message}
            onUse={onInsert}
            secondary={
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1 text-xs text-[#8A8278] hover:text-[#4A4540] transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Gerar outra
              </button>
            }
          />
          {result.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.suggestions.map((s, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  onClick={() => onInsert(s)}
                  className="cursor-pointer border-[#E8E4DC] bg-white text-xs text-[#4A4540] hover:border-[#B8B0A4] hover:bg-[#F8F6F1]"
                >
                  {s.length > 40 ? s.slice(0, 40) + '...' : s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <HistoryPills history={history} onSelect={onInsert} />
    </div>
  );
}

// ─── Improve Tab ──────────────────────────────────────────────────────────────

function ImproveTab({
  currentMessage,
  candidateName,
  onInsert,
}: {
  currentMessage: string;
  candidateName?: string;
  onInsert: (text: string) => void;
}) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ improved: string; changes: string[] } | null>(null);
  const [lastInstruction, setLastInstruction] = useState<string>('');

  const disabled = !currentMessage.trim();

  const handleImprove = useCallback(async (customInstruction?: string) => {
    const effectiveInstruction = customInstruction ?? instruction;
    setLoading(true);
    setError(null);
    setLastInstruction(effectiveInstruction);

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve',
          message: currentMessage,
          instruction: effectiveInstruction || undefined,
          candidateName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao melhorar mensagem');
        return;
      }
      setResult(data.result as { improved: string; changes: string[] });
    } catch {
      setError('Erro de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [currentMessage, instruction, candidateName]);

  return (
    <div className="space-y-3 pt-2">
      {disabled ? (
        <p className="text-xs text-[#8A8278] italic">
          Escreva uma mensagem no editor para usar a função de melhoria.
        </p>
      ) : (
        <>
          <div className="rounded-md border border-[#E8E4DC] bg-[#F8F6F1] px-3 py-2">
            <p className="text-xs text-[#8A8278] mb-1">Mensagem atual</p>
            <p className="text-sm text-[#4A4540] line-clamp-2">
              {currentMessage.slice(0, 120)}
              {currentMessage.length > 120 ? '...' : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {IMPROVE_QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                disabled={loading}
                onClick={() => handleImprove(action.instruction)}
                className="rounded-full border border-[#E8E4DC] bg-white px-2.5 py-0.5 text-xs text-[#4A4540] hover:border-[#B8B0A4] hover:bg-[#F8F6F1] transition-colors disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Instrução adicional..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={loading}
              className="h-8 border-[#E8E4DC] bg-white text-sm placeholder:text-[#B8B0A4] focus-visible:ring-1 focus-visible:ring-[#C8BFB4]"
            />
            <Button
              size="sm"
              disabled={loading}
              onClick={() => handleImprove()}
              className="h-8 shrink-0 gap-1.5 bg-[#2D2A24] text-white hover:bg-[#1a1815] text-xs disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Melhorar
            </Button>
          </div>

          {error && <ErrorBanner message={error} onRetry={() => handleImprove(lastInstruction)} />}

          {loading && <LoadingSkeleton />}

          {!loading && result && (
            <div className="space-y-2">
              <ResultCard
                text={result.improved}
                onUse={onInsert}
                label="Aplicar"
              />
              {result.changes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-[#8A8278]">O que mudou</p>
                  <ul className="space-y-0.5">
                    {result.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-[#4A4540]">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A8278]" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Rewrite Tab ──────────────────────────────────────────────────────────────

function RewriteTab({
  currentMessage,
  candidateName,
  onInsert,
}: {
  currentMessage: string;
  candidateName?: string;
  onInsert: (text: string) => void;
}) {
  const [style, setStyle] = useState<RewriteStyle>('shorter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rewritten: string } | null>(null);

  const disabled = !currentMessage.trim();

  const handleRewrite = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rewrite',
          message: currentMessage,
          style,
          candidateName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao reescrever mensagem');
        return;
      }
      setResult(data.result as { rewritten: string });
    } catch {
      setError('Erro de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [currentMessage, style, candidateName]);

  return (
    <div className="space-y-3 pt-2">
      {disabled ? (
        <p className="text-xs text-[#8A8278] italic">
          Escreva uma mensagem no editor para usar a função de reescrita.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STYLE_LABELS) as RewriteStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  style === s
                    ? 'bg-[#2D2A24] text-white'
                    : 'border border-[#E8E4DC] bg-white text-[#4A4540] hover:border-[#B8B0A4]'
                }`}
              >
                {STYLE_LABELS[s]}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            disabled={loading}
            onClick={handleRewrite}
            className="h-8 w-full gap-2 bg-[#2D2A24] text-white hover:bg-[#1a1815] text-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reescrevendo...
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Reescrever
              </>
            )}
          </Button>

          {error && <ErrorBanner message={error} onRetry={handleRewrite} />}

          {loading && <LoadingSkeleton />}

          {!loading && result && (
            <ResultCard
              text={result.rewritten}
              onUse={onInsert}
              label="Usar esta versão"
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GeminiMessageAssistant({
  currentMessage,
  onInsertMessage,
  candidateName,
  segmentDescription,
  className = '',
}: GeminiMessageAssistantProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border border-[#E8E4DC] bg-[#F8F6F1] ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2.5 transition-colors hover:bg-[#F2F0EB] rounded-t-lg"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[#8A8278]" />
          <span className="text-sm font-medium text-[#2D2A24]">Assistente IA</span>
          <Badge
            variant="outline"
            className="h-4 border-[#D8D4CC] bg-[#EDEAE4] px-1.5 text-[10px] text-[#6A6460]"
          >
            Gemini
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-xs text-[#8A8278]">Usar IA</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#8A8278]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#8A8278]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#E8E4DC] px-3 pb-3">
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="mt-3 h-8 w-full bg-[#EDEAE4]">
              <TabsTrigger
                value="generate"
                className="flex-1 text-xs data-[state=active]:bg-white data-[state=active]:text-[#2D2A24] data-[state=active]:shadow-sm"
              >
                Gerar
              </TabsTrigger>
              <TabsTrigger
                value="improve"
                className="flex-1 text-xs data-[state=active]:bg-white data-[state=active]:text-[#2D2A24] data-[state=active]:shadow-sm"
              >
                Melhorar
              </TabsTrigger>
              <TabsTrigger
                value="rewrite"
                className="flex-1 text-xs data-[state=active]:bg-white data-[state=active]:text-[#2D2A24] data-[state=active]:shadow-sm"
              >
                Reescrever
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate">
              <GenerateTab
                candidateName={candidateName}
                segmentDescription={segmentDescription}
                onInsert={onInsertMessage}
              />
            </TabsContent>

            <TabsContent value="improve">
              <ImproveTab
                currentMessage={currentMessage}
                candidateName={candidateName}
                onInsert={onInsertMessage}
              />
            </TabsContent>

            <TabsContent value="rewrite">
              <RewriteTab
                currentMessage={currentMessage}
                candidateName={candidateName}
                onInsert={onInsertMessage}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default GeminiMessageAssistant;
