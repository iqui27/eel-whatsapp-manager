'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
  instanceName?: string;
  evolutionApiUrl?: string;
  warmingEnabled?: boolean;
  warmingIntervalMinutes?: number;
  warmingMessage?: string;
}

// ─── Section card helper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [isLoading, setIsLoading] = useState(true);

  // Candidate profile
  const [candidateName, setCandidateName] = useState('');
  const [candidateParty, setCandidateParty] = useState('');
  const [candidateNumber, setCandidateNumber] = useState('');

  // Evolution API
  const [apiUrl, setApiUrl] = useState('');
  const [instanceName, setInstanceName] = useState('');

  // Gemini AI
  const [geminiKey, setGeminiKey] = useState('');

  // Notifications
  const [notifChipDisconnect, setNotifChipDisconnect] = useState(true);
  const [notifGroupFull, setNotifGroupFull] = useState(true);
  const [notifCampaignComplete, setNotifCampaignComplete] = useState(true);

  // Campaign defaults
  const [sendWindowStart, setSendWindowStart] = useState('08:00');
  const [sendWindowEnd, setSendWindowEnd] = useState('20:00');
  const [delayMin, setDelayMin] = useState('15');
  const [delayMax, setDelayMax] = useState('60');

  // Warming
  const [warmingEnabled, setWarmingEnabled] = useState(true);
  const [warmingInterval, setWarmingInterval] = useState('60');
  const [warmingMessage, setWarmingMessage] = useState('Aquecimento ativado!');

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/setup');
      if (res.ok) {
        const data: SettingsData = await res.json();
        setSettings(data);
        setApiUrl(data.evolutionApiUrl ?? '');
        setInstanceName(data.instanceName ?? '');
        setWarmingEnabled(data.warmingEnabled ?? true);
        setWarmingInterval(String(data.warmingIntervalMinutes ?? 60));
        setWarmingMessage(data.warmingMessage ?? 'Aquecimento ativado!');
      }
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const saveSection = async (section: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`${section} salvo com sucesso`);
      } else {
        toast.error(`Erro ao salvar ${section}`);
      }
    } catch {
      toast.error(`Erro ao salvar ${section}`);
    }
  };

  if (isLoading) {
    return (
      <SidebarLayout currentPage="settings" pageTitle="Configurações">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-xl bg-muted" />
            <div className="h-32 rounded-xl bg-muted" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="settings" pageTitle="Configurações">
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie as configurações do sistema EEL
          </p>
        </div>

        {/* 1. Candidato */}
        <SectionCard
          title="Perfil do Candidato"
          description="Informações básicas usadas nas campanhas e personalizações"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="candidate-name">Nome do Candidato</Label>
              <Input
                id="candidate-name"
                placeholder="Ex: João da Silva"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="candidate-number">Número</Label>
              <Input
                id="candidate-number"
                placeholder="Ex: 12345"
                value={candidateNumber}
                onChange={e => setCandidateNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="candidate-party">Partido</Label>
              <Input
                id="candidate-party"
                placeholder="Ex: Partido dos Trabalhadores"
                value={candidateParty}
                onChange={e => setCandidateParty(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={() => void saveSection('Perfil', { candidateName, candidateParty, candidateNumber })}>
            Salvar perfil
          </Button>
        </SectionCard>

        {/* 2. Evolution API */}
        <SectionCard
          title="Evolution API"
          description="Conexão com a Evolution API para envio via WhatsApp"
        >
          <div className="space-y-1.5">
            <Label htmlFor="api-url">URL da Evolution API</Label>
            <Input
              id="api-url"
              placeholder="https://evolution-api.seu-servidor.com"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instance-name">Nome da Instância</Label>
            <Input
              id="instance-name"
              placeholder="eel-instance"
              value={instanceName}
              onChange={e => setInstanceName(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => void saveSection('Evolution API', { evolutionApiUrl: apiUrl, instanceName })}>
            Salvar Evolution API
          </Button>
        </SectionCard>

        {/* 3. Gemini AI */}
        <SectionCard
          title="Gemini AI"
          description="Configure a chave de API do Google Gemini para análise de leads"
        >
          <div className="space-y-1.5">
            <Label htmlFor="gemini-key">GEMINI_API_KEY</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="AIza..."
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Obtida no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
              Usada para análise automática de leads, scoring de engajamento e sugestão de mensagens.
            </p>
          </div>
          <Button size="sm" onClick={() => void saveSection('Gemini AI', { geminiApiKey: geminiKey })}>
            Salvar chave Gemini
          </Button>
        </SectionCard>

        {/* 4. Notificações */}
        <SectionCard
          title="Notificações"
          description="Controle quais alertas operacionais são exibidos no painel"
        >
          <div className="space-y-3">
            {[
              { id: 'chip-disconnect', label: 'Chip desconectado', value: notifChipDisconnect, onChange: setNotifChipDisconnect },
              { id: 'group-full', label: 'Grupo atingiu capacidade', value: notifGroupFull, onChange: setNotifGroupFull },
              { id: 'campaign-complete', label: 'Campanha concluída', value: notifCampaignComplete, onChange: setNotifCampaignComplete },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                <button
                  id={item.id}
                  type="button"
                  onClick={() => item.onChange(!item.value)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${item.value ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow-sm ${item.value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => void saveSection('Notificações', { notifications: { chipDisconnect: notifChipDisconnect, groupFull: notifGroupFull, campaignComplete: notifCampaignComplete } })}>
            Salvar notificações
          </Button>
        </SectionCard>

        {/* 5. Campanhas */}
        <SectionCard
          title="Padrões de Campanhas"
          description="Janela de envio e intervalos padrão para novas campanhas"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="send-start">Início do envio</Label>
              <Input id="send-start" type="time" value={sendWindowStart} onChange={e => setSendWindowStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-end">Fim do envio</Label>
              <Input id="send-end" type="time" value={sendWindowEnd} onChange={e => setSendWindowEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delay-min">Delay mínimo (s)</Label>
              <Input id="delay-min" type="number" min={5} value={delayMin} onChange={e => setDelayMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delay-max">Delay máximo (s)</Label>
              <Input id="delay-max" type="number" min={10} value={delayMax} onChange={e => setDelayMax(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={() => void saveSection('Campanhas', { sendWindowStart, sendWindowEnd, delayMin: Number(delayMin), delayMax: Number(delayMax) })}>
            Salvar padrões
          </Button>
        </SectionCard>

        {/* 6. Aquecimento */}
        <SectionCard
          title="Aquecimento de Chips"
          description="Envio automático periódico para manter chips ativos"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Aquecimento automático</p>
              <p className="text-xs text-muted-foreground">Ativar envio automático via cron</p>
            </div>
            <button
              type="button"
              onClick={() => setWarmingEnabled(!warmingEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${warmingEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow-sm ${warmingEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {warmingEnabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="warming-interval">Intervalo (minutos)</Label>
                <Input
                  id="warming-interval"
                  type="number"
                  min={5}
                  max={1440}
                  className="w-32"
                  value={warmingInterval}
                  onChange={e => setWarmingInterval(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warming-message">Mensagem de aquecimento</Label>
                <textarea
                  id="warming-message"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  value={warmingMessage}
                  onChange={e => setWarmingMessage(e.target.value)}
                />
              </div>
            </>
          )}
          <Button size="sm" onClick={() => void saveSection('Aquecimento', { warmingEnabled, warmingIntervalMinutes: Number(warmingInterval), warmingMessage })}>
            Salvar aquecimento
          </Button>
        </SectionCard>
      </div>
    </SidebarLayout>
  );
}
