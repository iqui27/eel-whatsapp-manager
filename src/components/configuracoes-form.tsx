'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import {
  Bot, Key, Mail, Globe, Zap, Clock, User,
  Eye, EyeOff, Save, RefreshCw, CheckCircle2,
  AlertTriangle, Loader2, Settings, RotateCcw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnvVars {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  NEXT_PUBLIC_APP_URL: string;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  CRON_SECRET: string;
}

interface DbConfig {
  evolutionApiUrl: string | null;
  instanceName: string | null;
  candidateDisplayName: string | null;
  candidateOffice: string | null;
  candidateParty: string | null;
  candidateRegion: string | null;
  warmingEnabled: boolean | null;
  warmingIntervalMinutes: number | null;
  warmingMessage: string | null;
  sendWindowStart: string | null;
  sendWindowEnd: string | null;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        value ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <div className={cn(
        'absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow-sm',
        value ? 'translate-x-5' : 'translate-x-0.5',
      )} />
    </button>
  );
}

// ─── Secret Input ─────────────────────────────────────────────────────────────

function SecretInput({
  id, value, onChange, placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, description, children, badge,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
            </div>
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── GEMINI_MODELS ────────────────────────────────────────────────────────────

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash',        label: 'Gemini 2.5 Flash (recomendado)' },
  { value: 'gemini-2.5-pro',          label: 'Gemini 2.5 Pro (mais capaz, mais lento)' },
  { value: 'gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro Preview (mais novo)' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview (mais rápido)' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function ConfiguracoesForm() {
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [loadingDb, setLoadingDb] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  // Env vars state
  const [env, setEnv] = useState<EnvVars>({
    GEMINI_API_KEY: '', GEMINI_MODEL: '',
    RESEND_API_KEY: '', RESEND_FROM: '',
    NEXT_PUBLIC_APP_URL: '',
    EVOLUTION_API_URL: '', EVOLUTION_API_KEY: '',
    CRON_SECRET: '',
  });

  // DB config state
  const [db, setDb] = useState<DbConfig>({
    evolutionApiUrl: '', instanceName: '',
    candidateDisplayName: '', candidateOffice: '', candidateParty: '', candidateRegion: '',
    warmingEnabled: true, warmingIntervalMinutes: 60, warmingMessage: '',
    sendWindowStart: '08:00', sendWindowEnd: '20:00',
  });

  const loadAll = useCallback(async () => {
    setLoadingEnv(true);
    setLoadingDb(true);
    try {
      const [envRes, dbRes] = await Promise.all([
        fetch('/api/env'),
        fetch('/api/config'),
      ]);
      if (envRes.ok) {
        const data = await envRes.json() as EnvVars;
        setEnv(data);
      }
      if (dbRes.ok) {
        const data = await dbRes.json() as DbConfig;
        setDb(data);
      }
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoadingEnv(false);
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // ── Save env section ──
  const saveEnv = async (section: string, keys: (keyof EnvVars)[]) => {
    setSavingSection(section);
    try {
      const payload: Partial<EnvVars> = {};
      for (const k of keys) payload[k] = env[k];

      const res = await fetch('/api/env', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`${section} salvo. Reinicie o servidor para aplicar.`);
      } else {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        toast.error(err?.error ?? `Erro ao salvar ${section}`);
      }
    } catch {
      toast.error(`Erro ao salvar ${section}`);
    } finally {
      setSavingSection(null);
    }
  };

  // ── Save db section ──
  const saveDb = async (section: string, fields: Partial<DbConfig>) => {
    setSavingSection(section);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        toast.success(`${section} salvo`);
      } else {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        toast.error(err?.error ?? `Erro ao salvar ${section}`);
      }
    } catch {
      toast.error(`Erro ao salvar ${section}`);
    } finally {
      setSavingSection(null);
    }
  };

  // ── Restart server ──
  const restartServer = async () => {
    setRestarting(true);
    try {
      const res = await fetch('/api/env/restart', { method: 'POST' });
      if (res.ok) {
        toast.success('Reinicialização iniciada. Aguarde ~10s e recarregue a página.', { duration: 8000 });
        setTimeout(() => window.location.reload(), 10000);
      } else {
        toast.error('Erro ao reiniciar servidor');
        setRestarting(false);
      }
    } catch {
      toast.error('Erro ao reiniciar servidor');
      setRestarting(false);
    }
  };

  const isLoading = loadingEnv || loadingDb;

  return (
    <SidebarLayout currentPage="settings" pageTitle="Configurações">
      <div className="p-6 space-y-8 max-w-3xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Configurações do Sistema</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              APIs, modelos de IA, email, campanhas e comportamento do servidor
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={restarting}>
                {restarting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Reiniciando...</>
                  : <><RotateCcw className="h-4 w-4" />Reiniciar servidor</>
                }
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reiniciar o servidor?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso aplicará todas as variáveis de ambiente salvas. O sistema ficará indisponível por ~10 segundos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void restartServer()}>Reiniciar agora</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando configurações...
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── 1. Candidato ── */}
            <SectionCard icon={User} title="Perfil do Candidato"
              description="Informações usadas em personalizações e campanhas">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome do Candidato" hint="Exibido nos templates de mensagem">
                  <Input value={db.candidateDisplayName ?? ''} onChange={e => setDb(p => ({ ...p, candidateDisplayName: e.target.value }))} placeholder="Ex: João da Silva" />
                </Field>
                <Field label="Cargo disputado">
                  <Input value={db.candidateOffice ?? ''} onChange={e => setDb(p => ({ ...p, candidateOffice: e.target.value }))} placeholder="Ex: Vereador, Deputado" />
                </Field>
                <Field label="Partido">
                  <Input value={db.candidateParty ?? ''} onChange={e => setDb(p => ({ ...p, candidateParty: e.target.value }))} placeholder="Ex: PT, PSD..." />
                </Field>
                <Field label="Região">
                  <Input value={db.candidateRegion ?? ''} onChange={e => setDb(p => ({ ...p, candidateRegion: e.target.value }))} placeholder="Ex: Brasília - DF" />
                </Field>
              </div>
              <Button size="sm" className="gap-1.5"
                disabled={savingSection === 'Candidato'}
                onClick={() => void saveDb('Candidato', {
                  candidateDisplayName: db.candidateDisplayName,
                  candidateOffice: db.candidateOffice,
                  candidateParty: db.candidateParty,
                  candidateRegion: db.candidateRegion,
                })}>
                {savingSection === 'Candidato' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar perfil
              </Button>
            </SectionCard>

            {/* ── 2. Gemini AI ── */}
            <SectionCard icon={Bot} title="Gemini AI" badge="Variável de ambiente"
              description="Google Gemini para análise de leads, scoring e sugestão de mensagens">
              <Field label="GEMINI_API_KEY"
                hint="Obtida em aistudio.google.com/app/apikey — usada para análise de leads e scoring">
                <SecretInput id="gemini-key" value={env.GEMINI_API_KEY}
                  onChange={v => setEnv(p => ({ ...p, GEMINI_API_KEY: v }))}
                  placeholder="AIzaSy..." />
              </Field>
              <Field label="GEMINI_MODEL" hint="Modelo usado em todas as análises de IA">
                <Select value={env.GEMINI_MODEL || 'gemini-2.5-flash'}
                  onValueChange={v => setEnv(p => ({ ...p, GEMINI_MODEL: v }))}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value} className="font-mono text-sm">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Após salvar a API key, reinicie o servidor para que ela entre em vigor.
                </p>
              </div>
              <Button size="sm" className="gap-1.5"
                disabled={savingSection === 'Gemini'}
                onClick={() => void saveEnv('Gemini', ['GEMINI_API_KEY', 'GEMINI_MODEL'])}>
                {savingSection === 'Gemini' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar configuração Gemini
              </Button>
            </SectionCard>

            {/* ── 3. Email (Resend) ── */}
            <SectionCard icon={Mail} title="Email — Resend" badge="Variável de ambiente"
              description="Envio de convites de usuário e notificações via Resend (domínio iqui27.app)">
              <Field label="RESEND_API_KEY" hint="Obtida em resend.com/api-keys">
                <SecretInput id="resend-key" value={env.RESEND_API_KEY}
                  onChange={v => setEnv(p => ({ ...p, RESEND_API_KEY: v }))}
                  placeholder="re_..." />
              </Field>
              <Field label="RESEND_FROM" hint="Endereço de remetente — deve usar domínio verificado no Resend">
                <Input value={env.RESEND_FROM || 'EEL Eleitoral <equipe@iqui27.app>'}
                  onChange={e => setEnv(p => ({ ...p, RESEND_FROM: e.target.value }))}
                  placeholder="EEL Eleitoral <equipe@iqui27.app>"
                  className="font-mono text-sm" />
              </Field>
              <Button size="sm" className="gap-1.5"
                disabled={savingSection === 'Email'}
                onClick={() => void saveEnv('Email', ['RESEND_API_KEY', 'RESEND_FROM'])}>
                {savingSection === 'Email' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar configuração de email
              </Button>
            </SectionCard>

            {/* ── 4. Evolution API ── */}
            <SectionCard icon={Zap} title="Evolution API (WhatsApp)" badge="Variável de ambiente"
              description="Conexão com a Evolution API para envio e recebimento via WhatsApp">
              <Field label="Evolution API URL (runtime override)"
                hint="Substitui o valor salvo no banco de dados se preenchido">
                <Input value={env.EVOLUTION_API_URL}
                  onChange={e => setEnv(p => ({ ...p, EVOLUTION_API_URL: e.target.value }))}
                  placeholder="https://evolution.iqui27.app"
                  className="font-mono text-sm" />
              </Field>
              <Field label="Evolution API Key (runtime override)">
                <SecretInput id="evo-key" value={env.EVOLUTION_API_KEY}
                  onChange={v => setEnv(p => ({ ...p, EVOLUTION_API_KEY: v }))}
                  placeholder="429683C4..." />
              </Field>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuração no banco (usado pelo sistema)</p>
                <Field label="URL da Evolution API">
                  <Input value={db.evolutionApiUrl ?? ''}
                    onChange={e => setDb(p => ({ ...p, evolutionApiUrl: e.target.value }))}
                    placeholder="https://evolution.iqui27.app"
                    className="font-mono text-sm" />
                </Field>
                <Field label="Instância padrão">
                  <Input value={db.instanceName ?? ''}
                    onChange={e => setDb(p => ({ ...p, instanceName: e.target.value }))}
                    placeholder="Marcela1" />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5"
                  disabled={savingSection === 'Evolution env'}
                  onClick={() => void saveEnv('Evolution env', ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'])}>
                  {savingSection === 'Evolution env' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                  Salvar variáveis de ambiente
                </Button>
                <Button size="sm" className="gap-1.5"
                  disabled={savingSection === 'Evolution db'}
                  onClick={() => void saveDb('Evolution db', { evolutionApiUrl: db.evolutionApiUrl, instanceName: db.instanceName })}>
                  {savingSection === 'Evolution db' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar no banco
                </Button>
              </div>
            </SectionCard>

            {/* ── 5. App URL & Cron ── */}
            <SectionCard icon={Globe} title="Servidor & Cron" badge="Variável de ambiente"
              description="URL pública da aplicação e segredo do cron job">
              <Field label="NEXT_PUBLIC_APP_URL" hint="URL pública usada em emails de convite e links do sistema">
                <Input value={env.NEXT_PUBLIC_APP_URL}
                  onChange={e => setEnv(p => ({ ...p, NEXT_PUBLIC_APP_URL: e.target.value }))}
                  placeholder="https://zap.iqui27.app"
                  className="font-mono text-sm" />
              </Field>
              <Field label="CRON_SECRET" hint="Token de autenticação para os endpoints /api/cron/*">
                <SecretInput id="cron-secret" value={env.CRON_SECRET}
                  onChange={v => setEnv(p => ({ ...p, CRON_SECRET: v }))}
                  placeholder="zap-cron-..." />
              </Field>
              <Button size="sm" className="gap-1.5"
                disabled={savingSection === 'Servidor'}
                onClick={() => void saveEnv('Servidor', ['NEXT_PUBLIC_APP_URL', 'CRON_SECRET'])}>
                {savingSection === 'Servidor' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </Button>
            </SectionCard>

            {/* ── 6. Campanhas ── */}
            <SectionCard icon={Clock} title="Padrões de Campanhas"
              description="Janela de envio e delays para novas campanhas">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Início do envio">
                  <Input type="time" value={db.sendWindowStart ?? '08:00'}
                    onChange={e => setDb(p => ({ ...p, sendWindowStart: e.target.value }))} />
                </Field>
                <Field label="Fim do envio">
                  <Input type="time" value={db.sendWindowEnd ?? '20:00'}
                    onChange={e => setDb(p => ({ ...p, sendWindowEnd: e.target.value }))} />
                </Field>
              </div>
              <Button size="sm" className="gap-1.5"
                disabled={savingSection === 'Campanhas'}
                onClick={() => void saveDb('Campanhas', { sendWindowStart: db.sendWindowStart, sendWindowEnd: db.sendWindowEnd })}>
                {savingSection === 'Campanhas' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar padrões
              </Button>
            </SectionCard>

            {/* ── 7. Aquecimento ── */}
            <SectionCard icon={RefreshCw} title="Aquecimento de Chips"
              description="Envio automático periódico para manter os chips WhatsApp ativos">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Aquecimento automático</p>
                  <p className="text-xs text-muted-foreground">Ativar envio via cron job</p>
                </div>
                <Toggle value={db.warmingEnabled ?? true}
                  onChange={v => setDb(p => ({ ...p, warmingEnabled: v }))} />
              </div>
              {db.warmingEnabled && (
                <>
                  <Field label="Intervalo (minutos)">
                    <Input type="number" min={5} max={1440} className="w-32"
                      value={db.warmingIntervalMinutes ?? 60}
                      onChange={e => setDb(p => ({ ...p, warmingIntervalMinutes: Number(e.target.value) }))} />
                  </Field>
                  <Field label="Mensagem de aquecimento">
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      value={db.warmingMessage ?? ''}
                      onChange={e => setDb(p => ({ ...p, warmingMessage: e.target.value }))}
                    />
                  </Field>
                </>
              )}
              <Button size="sm" className="gap-1.5"
                disabled={savingSection === 'Aquecimento'}
                onClick={() => void saveDb('Aquecimento', {
                  warmingEnabled: db.warmingEnabled,
                  warmingIntervalMinutes: db.warmingIntervalMinutes,
                  warmingMessage: db.warmingMessage,
                })}>
                {savingSection === 'Aquecimento' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar aquecimento
              </Button>
            </SectionCard>

            {/* ── Status resumo ── */}
            <Card className="border-border/50 bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Status das Integrações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Gemini AI', active: !!env.GEMINI_API_KEY },
                    { label: 'Resend Email', active: !!env.RESEND_API_KEY },
                    { label: 'Evolution API', active: !!env.EVOLUTION_API_KEY || !!db.evolutionApiUrl },
                    { label: 'URL Pública', active: !!env.NEXT_PUBLIC_APP_URL },
                    { label: 'Cron Secret', active: !!env.CRON_SECRET },
                    { label: 'Candidato', active: !!db.candidateDisplayName },
                  ].map(item => (
                    <div key={item.label} className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2',
                      item.active ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 'border-border bg-background',
                    )}>
                      {item.active
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      }
                      <span className={cn('text-xs font-medium', item.active ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </SidebarLayout>
  );
}