'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Server,
  Flame,
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Plug,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import SidebarLayout from '@/components/SidebarLayout';
import {
  SUPPORTED_CAMPAIGN_VARIABLES,
  buildCampaignPreviewContext,
} from '@/lib/campaign-variables';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Settings {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instanceName: string;
  warmingEnabled: boolean;
  warmingIntervalMinutes: number;
  warmingMessage: string;
  candidateDisplayName: string;
  candidateOffice: string;
  candidateParty: string;
  candidateRegion: string;
}

function Section({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    evolutionApiUrl: '',
    evolutionApiKey: '',
    instanceName: '',
    warmingEnabled: true,
    warmingIntervalMinutes: 60,
    warmingMessage: '',
    candidateDisplayName: '',
    candidateOffice: '',
    candidateParty: '',
    candidateRegion: '',
  });
  const [candidateProfileReady, setCandidateProfileReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const previewContext = buildCampaignPreviewContext({
    candidateProfile: {
      candidateDisplayName: settings.candidateDisplayName,
    },
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          evolutionApiUrl: data.evolutionApiUrl ?? '',
          evolutionApiKey: data.evolutionApiKey ?? '',
          instanceName: data.instanceName ?? '',
          warmingEnabled: data.warmingEnabled ?? true,
          warmingIntervalMinutes: data.warmingIntervalMinutes ?? 60,
          warmingMessage: data.warmingMessage ?? '',
          candidateDisplayName: data.candidateDisplayName ?? '',
          candidateOffice: data.candidateOffice ?? '',
          candidateParty: data.candidateParty ?? '',
          candidateRegion: data.candidateRegion ?? '',
        });
        setCandidateProfileReady(Boolean(data.candidateProfileReady));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCandidateProfileReady(Boolean(data.candidateProfileReady));
        toast.success('Configurações salvas com sucesso');
      } else {
        toast.error(data.error ?? 'Erro ao salvar configurações');
      }
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', { method: 'POST' });
      const data = await res.json();
      setTestResult({ ok: data.success, msg: data.message });
      if (data.success) toast.success('Conexão com a API funcionando');
      else toast.error('Falha na conexão com a API');
    } catch {
      setTestResult({ ok: false, msg: 'Não foi possível testar a conexão' });
      toast.error('Não foi possível testar a conexão');
    } finally {
      setTesting(false);
    }
  };

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setSettings(s => ({ ...s, [key]: val }));

  if (loading) {
    return (
      <SidebarLayout currentPage="settings" pageTitle="Configurações">
        <div className="p-6 space-y-5">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card h-[72px] shimmer" />
          ))}
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="settings" pageTitle="Configurações">
      <div className="p-6 space-y-5 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie as configurações do sistema</p>
        </div>

        {/* Evolution API section */}
        <Section
          title="Evolution API"
          description="Conexão com o servidor WhatsApp"
          icon={Server}
          defaultOpen
        >
          <Field label="URL da API" hint="Endereço completo do servidor Evolution API">
            <input
              type="url"
              value={settings.evolutionApiUrl}
              onChange={e => set('evolutionApiUrl', e.target.value)}
              placeholder="https://api.evolution.example.com"
              className={inputCls}
            />
          </Field>

          <Field label="API Key">
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.evolutionApiKey}
                onChange={e => set('evolutionApiKey', e.target.value)}
                placeholder="Sua API key secreta"
                className={cn(inputCls, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>

          <Field label="Nome da Instância" hint="Nome da instância configurada na Evolution API">
            <input
              type="text"
              value={settings.instanceName}
              onChange={e => set('instanceName', e.target.value)}
              placeholder="minha-instancia"
              className={inputCls}
            />
          </Field>

          {/* Test connection */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={testing || !settings.evolutionApiUrl}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn('flex items-center gap-1.5 text-xs font-medium', testResult.ok ? 'text-success' : 'text-destructive')}
                >
                  {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {testResult.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>

        {/* Warming section */}
        <Section
          title="Perfil do candidato"
          description="Fonte de verdade usada pela personalização de campanhas"
          icon={CheckCircle2}
          defaultOpen
        >
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-foreground">
                  O campo <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">{'{candidato}'}</code> nas campanhas
                  usa o nome configurado aqui.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Este bloco é a fonte de verdade do contrato compartilhado de personalização.
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  candidateProfileReady
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700',
                )}
              >
                {candidateProfileReady ? 'Perfil pronto' : 'Perfil pendente'}
              </span>
            </div>
          </div>

          <Field
            label="Nome exibido"
            hint="Valor persistido que abastece diretamente a variável {candidato} em campanhas."
          >
            <input
              type="text"
              value={settings.candidateDisplayName}
              onChange={e => set('candidateDisplayName', e.target.value)}
              placeholder="Ex: Dr. Silva"
              className={inputCls}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Cargo"
              hint="Opcional. Ajuda a contextualizar o perfil em futuras superfícies."
            >
              <input
                type="text"
                value={settings.candidateOffice}
                onChange={e => set('candidateOffice', e.target.value)}
                placeholder="Ex: Vereador"
                className={inputCls}
              />
            </Field>

            <Field
              label="Partido"
              hint="Opcional. Mantido junto do mesmo perfil de campanha."
            >
              <input
                type="text"
                value={settings.candidateParty}
                onChange={e => set('candidateParty', e.target.value)}
                placeholder="Ex: PSD"
                className={inputCls}
              />
            </Field>
          </div>

          <Field
            label="Região prioritária"
            hint="Opcional. Pode ser reutilizada por campanhas e mensagens regionais."
          >
            <input
              type="text"
              value={settings.candidateRegion}
              onChange={e => set('candidateRegion', e.target.value)}
              placeholder="Ex: Zona Sul"
              className={inputCls}
            />
          </Field>

          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Contrato atual de variáveis
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUPPORTED_CAMPAIGN_VARIABLES.map((variable) => (
                <div
                  key={variable.key}
                  className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs"
                >
                  <div className="font-mono text-foreground">{variable.key}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {variable.label} · {variable.source}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Preview atual do <code className="rounded bg-muted px-1 py-0.5 font-mono">{'{candidato}'}</code>:
              {' '}
              <span className="font-medium text-foreground">{previewContext['{candidato}']}</span>
            </p>
          </div>
        </Section>

        <Section
          title="Aquecimento"
          description="Configurações de envio automático de mensagens"
          icon={Flame}
          defaultOpen
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Aquecimento automático</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enviar mensagens automaticamente via cron job</p>
            </div>
            <Switch
              checked={settings.warmingEnabled}
              onCheckedChange={v => set('warmingEnabled', v)}
            />
          </div>

          <Field label="Intervalo entre mensagens" hint="Tempo mínimo de espera entre envios (5–1440 minutos)">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.warmingIntervalMinutes}
                onChange={e => set('warmingIntervalMinutes', Number(e.target.value))}
                className={cn(inputCls, 'w-28')}
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>
          </Field>

          <Field label="Mensagem padrão" hint="Conteúdo enviado nas sessões de aquecimento">
            <textarea
              value={settings.warmingMessage}
              onChange={e => set('warmingMessage', e.target.value)}
              rows={3}
              placeholder="Olá! Esta é uma mensagem de aquecimento..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
            />
          </Field>
        </Section>

        {/* Security section */}
        <Section
          title="Segurança"
          description="Autenticação e acesso ao painel"
          icon={Shield}
          defaultOpen={false}
        >
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              A senha de acesso é configurada via variável de ambiente <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">EEL_PASSWORD</code> no servidor.
              Para alterar, atualize o valor no arquivo <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">.env.local</code> e reinicie o servidor.
            </p>
          </div>
        </Section>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}
