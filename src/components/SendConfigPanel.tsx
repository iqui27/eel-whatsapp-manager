'use client';

/**
 * SendConfigPanel — Reusable campaign send configuration section.
 *
 * Used on:
 *  - campanhas/nova      (full panel)
 *  - campanhas/[id]/editar  (full panel)
 *  - campanhas/[id]/agendar (full panel, with compact=false showing all fields)
 *
 * Presets: Lento / Normal / Rápido — set batchSize, delays and rest intervals.
 * Time window: real <input type="time"> for windowStart / windowEnd.
 * Multi-chip checklist with health dots.
 * Chip strategy selector (shown when >1 chip selected).
 * Per-chip limits and circuit breaker threshold.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronDown, ChevronUp, Settings2, Zap } from 'lucide-react';
import type { Chip } from '@/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendConfigValue {
  sendRate: 'slow' | 'normal' | 'fast';
  batchSize: number;
  minDelayMs: number;
  maxDelayMs: number;
  typingDelayMin: number;
  typingDelayMax: number;
  maxDailyPerChip: number;
  maxHourlyPerChip: number;
  pauseOnChipDegraded: boolean;
  selectedChipIds: string[];
  chipStrategy: 'round_robin' | 'least_loaded' | 'affinity';
  restPauseEvery: number;
  restPauseDurationMs: number;
  longBreakEvery: number;
  longBreakDurationMs: number;
  circuitBreakerThreshold: number;
  windowStart: string; // 'HH:MM'
  windowEnd: string;   // 'HH:MM'
}

export const DEFAULT_SEND_CONFIG: SendConfigValue = {
  sendRate: 'normal',
  batchSize: 10,
  minDelayMs: 15000,
  maxDelayMs: 60000,
  typingDelayMin: 2000,
  typingDelayMax: 5000,
  maxDailyPerChip: 200,
  maxHourlyPerChip: 25,
  pauseOnChipDegraded: true,
  selectedChipIds: [],
  chipStrategy: 'round_robin',
  restPauseEvery: 20,
  restPauseDurationMs: 180000,
  longBreakEvery: 100,
  longBreakDurationMs: 900000,
  circuitBreakerThreshold: 5,
  windowStart: '08:00',
  windowEnd: '20:00',
};

type Preset = 'slow' | 'normal' | 'fast';

const PRESETS: Record<Preset, Partial<SendConfigValue>> = {
  slow: {
    sendRate: 'slow',
    batchSize: 5,
    minDelayMs: 30000,
    maxDelayMs: 90000,
    restPauseEvery: 15,
    longBreakEvery: 60,
  },
  normal: {
    sendRate: 'normal',
    batchSize: 10,
    minDelayMs: 15000,
    maxDelayMs: 60000,
    restPauseEvery: 20,
    longBreakEvery: 100,
  },
  fast: {
    sendRate: 'fast',
    batchSize: 20,
    minDelayMs: 8000,
    maxDelayMs: 30000,
    restPauseEvery: 25,
    longBreakEvery: 120,
  },
};

const PRESET_LABELS: Record<Preset, { label: string; sublabel: string; warning?: boolean }> = {
  slow: { label: 'Lento', sublabel: 'Lote 5 · 30–90s delay' },
  normal: { label: 'Normal', sublabel: 'Lote 10 · 15–60s delay' },
  fast: { label: 'Rápido', sublabel: 'Lote 20 · 8–30s delay', warning: true },
};

const STRATEGY_INFO: Record<SendConfigValue['chipStrategy'], { label: string; description: string }> = {
  round_robin: {
    label: 'Rodízio',
    description: 'Alterna chips em sequência. Distribui igualmente, independente da carga atual.',
  },
  least_loaded: {
    label: 'Menos Carregado',
    description: 'Sempre envia pelo chip com menor uso no dia. Equilibra carga automaticamente.',
  },
  affinity: {
    label: 'Afinidade',
    description: 'Prefere reenviar pelo mesmo chip que já conversou com o contato antes.',
  },
};

// ─── Health dot ───────────────────────────────────────────────────────────────

function HealthDot({ status }: { status: string }) {
  const color =
    status === 'healthy'
      ? 'bg-green-500'
      : status === 'degraded' || status === 'cooldown'
        ? 'bg-amber-400'
        : status === 'quarantined' || status === 'banned'
          ? 'bg-red-500'
          : 'bg-gray-300'; // disconnected / warming_up / unknown

  return <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', color)} />;
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface SendConfigPanelProps {
  value: SendConfigValue;
  onChange: (next: SendConfigValue) => void;
  allChips: Chip[];
  disabled?: boolean;
}

export function SendConfigPanel({ value, onChange, allChips, disabled = false }: SendConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const set = <K extends keyof SendConfigValue>(key: K, val: SendConfigValue[K]) =>
    onChange({ ...value, [key]: val });

  const applyPreset = (preset: Preset) => {
    setShowCustom(false);
    onChange({ ...value, ...PRESETS[preset] });
  };

  const activePreset = (['slow', 'normal', 'fast'] as Preset[]).find(
    (p) =>
      PRESETS[p].sendRate === value.sendRate &&
      PRESETS[p].batchSize === value.batchSize &&
      PRESETS[p].minDelayMs === value.minDelayMs,
  );

  const toggleChip = (chipId: string) => {
    const ids = value.selectedChipIds.includes(chipId)
      ? value.selectedChipIds.filter((id) => id !== chipId)
      : [...value.selectedChipIds, chipId];
    set('selectedChipIds', ids);
  };

  const msToSeconds = (ms: number) => Math.round(ms / 1000);
  const secondsToMs = (s: number) => s * 1000;
  const msToMinutes = (ms: number) => Math.round(ms / 60000);
  const minutesToMs = (m: number) => m * 60000;

  return (
    <Card>
      {/* ── Header (always visible) ── */}
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Configuração de Envio
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {open ? (
              <>
                Ocultar <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Configurar <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </CardTitle>

        {/* Quick summary line when collapsed */}
        {!open && (
          <p className="text-xs text-muted-foreground">
            {activePreset ? PRESET_LABELS[activePreset].label : 'Personalizado'} ·{' '}
            Janela: {value.windowStart}–{value.windowEnd} ·{' '}
            {value.selectedChipIds.length > 0
              ? `${value.selectedChipIds.length} chip${value.selectedChipIds.length > 1 ? 's' : ''} selecionado${value.selectedChipIds.length > 1 ? 's' : ''}`
              : 'Auto (todos os chips)'}
          </p>
        )}
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">

          {/* ── 1. Velocidade (Presets) ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Velocidade de Envio
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['slow', 'normal', 'fast'] as Preset[]).map((preset) => {
                const isActive = activePreset === preset && !showCustom;
                const info = PRESET_LABELS[preset];
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    <span className="text-sm font-semibold">{info.label}</span>
                    <span className="text-[10px] opacity-75">{info.sublabel}</span>
                    {info.warning && (
                      <Badge className="mt-0.5 text-[9px] bg-amber-500/10 text-amber-600 border-amber-200 px-1.5">
                        risco
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Personalizado toggle */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowCustom((s) => !s)}
              className="text-xs text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showCustom ? '▲ Ocultar configuração avançada' : '▼ Configuração avançada (personalizado)'}
            </button>

            {showCustom && (
              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Lote (msgs por vez)</Label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={value.batchSize}
                      onChange={(e) => set('batchSize', Number(e.target.value))}
                      disabled={disabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delay mín (segundos)</Label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={msToSeconds(value.minDelayMs)}
                      onChange={(e) => set('minDelayMs', secondsToMs(Number(e.target.value)))}
                      disabled={disabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delay máx (segundos)</Label>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={msToSeconds(value.maxDelayMs)}
                      onChange={(e) => set('maxDelayMs', secondsToMs(Number(e.target.value)))}
                      disabled={disabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pausar a cada N msgs</Label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={value.restPauseEvery}
                      onChange={(e) => set('restPauseEvery', Number(e.target.value))}
                      disabled={disabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duração da pausa (min)</Label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={msToMinutes(value.restPauseDurationMs)}
                      onChange={(e) => set('restPauseDurationMs', minutesToMs(Number(e.target.value)))}
                      disabled={disabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pausa longa a cada N msgs</Label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      value={value.longBreakEvery}
                      onChange={(e) => set('longBreakEvery', Number(e.target.value))}
                      disabled={disabled}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {value.sendRate === 'fast' && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Velocidade alta aumenta risco de bloqueio. Recomendado apenas para chips aquecidos.</span>
              </div>
            )}
          </section>

          <Separator />

          {/* ── 2. Janela de Envio ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Janela de Envio
            </p>
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <input
                  type="time"
                  value={value.windowStart}
                  onChange={(e) => set('windowStart', e.target.value)}
                  disabled={disabled}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
              <span className="text-sm text-muted-foreground mt-5">–</span>
              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <input
                  type="time"
                  value={value.windowEnd}
                  onChange={(e) => set('windowEnd', e.target.value)}
                  disabled={disabled}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Envios serão distribuídos dentro desta janela. Fora dela, o envio pausa automaticamente.
            </p>
          </section>

          <Separator />

          {/* ── 3. Seleção de Chips ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chips de Envio
            </p>
            {allChips.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Nenhum chip disponível. Configure chips em Ajustes.
              </p>
            ) : (
              <div className="space-y-1">
                {allChips.map((chip) => {
                  const checked = value.selectedChipIds.includes(chip.id);
                  const sent = chip.messagesSentToday ?? 0;
                  const limit = chip.dailyLimit ?? 200;
                  const pct = Math.min((sent / limit) * 100, 100);
                  const isUnhealthy = chip.healthStatus && chip.healthStatus !== 'healthy' && chip.healthStatus !== 'disconnected';
                  const statusLabel: Record<string, string> = {
                    degraded: 'Degradado',
                    not_found: 'Não encontrado',
                    cooldown: 'Cooldown',
                    error: 'Erro',
                  };
                  return (
                    <label
                      key={chip.id}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors overflow-hidden',
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/30',
                        disabled && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {/* Usage fill behind content */}
                      {pct > 0 && (
                        <div
                          className={cn('absolute inset-y-0 left-0 opacity-[0.06] transition-all', pct > 80 ? 'bg-amber-500' : 'bg-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChip(chip.id)}
                        disabled={disabled}
                        className="accent-primary shrink-0 relative"
                      />
                      <HealthDot status={chip.healthStatus ?? 'disconnected'} />
                      <span className="text-sm font-medium text-foreground truncate flex-1 relative">{chip.name}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono relative">{chip.phone}</span>
                      {isUnhealthy && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-200/60 relative shrink-0">
                          {statusLabel[chip.healthStatus!] ?? chip.healthStatus}
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-muted-foreground relative shrink-0">
                        {sent}<span className="text-muted-foreground/40">/{limit}</span>
                      </span>
                    </label>
                  );
                })}
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  Deixe todos desmarcados para usar chips conectados automaticamente.
                </p>
              </div>
            )}

            {/* Strategy (only when > 1 chip selected) */}
            {value.selectedChipIds.length > 1 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground font-medium">Estratégia de distribuição</p>
                <div className="grid gap-1.5">
                  {(['round_robin', 'least_loaded', 'affinity'] as const).map((strat) => {
                    const active = value.chipStrategy === strat;
                    const info = STRATEGY_INFO[strat];
                    return (
                      <button
                        key={strat}
                        type="button"
                        disabled={disabled}
                        onClick={() => set('chipStrategy', strat)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/30',
                        )}
                      >
                        <span className={cn(
                          'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors',
                          active ? 'border-primary bg-primary' : 'border-border',
                        )} />
                        <div>
                          <p className={cn('text-xs font-medium', active ? 'text-primary' : 'text-foreground')}>
                            {info.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                            {info.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* ── 4. Limites por Chip ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Limites por Chip
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Máx. por dia / chip</Label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={value.maxDailyPerChip}
                  onChange={(e) => set('maxDailyPerChip', Number(e.target.value))}
                  disabled={disabled}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Máx. por hora / chip</Label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={value.maxHourlyPerChip}
                  onChange={(e) => set('maxHourlyPerChip', Number(e.target.value))}
                  disabled={disabled}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── 5. Circuit Breaker ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Proteção Anti-ban
            </p>
            <div className="space-y-1">
              <Label className="text-xs">
                Pausar envio se taxa de erro ultrapassar {value.circuitBreakerThreshold}%
              </Label>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={value.circuitBreakerThreshold}
                onChange={(e) => set('circuitBreakerThreshold', Number(e.target.value))}
                disabled={disabled}
                className="w-full accent-primary disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1% (conservador)</span>
                <span className="font-medium text-foreground">{value.circuitBreakerThreshold}%</span>
                <span>50% (permissivo)</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Pausar se chip degradar</p>
                <p className="text-xs text-muted-foreground">
                  Para o envio automaticamente se um chip entrar em estado degradado
                </p>
              </div>
              <Switch
                checked={value.pauseOnChipDegraded}
                onCheckedChange={(checked) => set('pauseOnChipDegraded', checked)}
                disabled={disabled}
              />
            </div>
          </section>
        </CardContent>
      )}
    </Card>
  );
}
