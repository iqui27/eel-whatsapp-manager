'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SetupFormData {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  authPassword: string;
  confirmPassword: string;
  warmingEnabled: boolean;
  warmingIntervalMinutes: number;
  warmingMessage: string;
  instanceName: string;
}

const STEPS = [
  { id: 1, label: 'API', title: 'Evolution API', description: 'Configure a conexão com a Evolution API' },
  { id: 2, label: 'Senha', title: 'Acesso', description: 'Defina uma senha de acesso ao painel' },
  { id: 3, label: 'Aquecimento', title: 'Aquecimento', description: 'Configure o sistema de aquecimento automático' },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [setupStatus, setSetupStatus] = useState<'checking' | 'ready' | 'configured' | 'error'>('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [configuredInstanceName, setConfiguredInstanceName] = useState<string | null>(null);
  const [formData, setFormData] = useState<SetupFormData>({
    evolutionApiUrl: '',
    evolutionApiKey: '',
    authPassword: '',
    confirmPassword: '',
    warmingEnabled: true,
    warmingIntervalMinutes: 60,
    warmingMessage: '🔔 Aquecimento ativado!',
    instanceName: 'eel-instance',
  });

  const checkSetupStatus = useCallback(async () => {
    setError('');
    setSetupStatus('checking');

    try {
      const res = await fetch('/api/setup', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Não foi possível verificar o ambiente');
      }

      const data = await res.json() as { configured?: boolean; instanceName?: string | null };
      setConfiguredInstanceName(data.instanceName ?? null);
      setSetupStatus(data.configured ? 'configured' : 'ready');
    } catch (err) {
      setSetupStatus('error');
      setError(err instanceof Error ? err.message : 'Não foi possível verificar o ambiente');
    }
  }, []);

  useEffect(() => {
    void checkSetupStatus();
  }, [checkSetupStatus]);

  const handleChange = (field: keyof SetupFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.evolutionApiUrl) return setError('URL da Evolution API é obrigatória'), false;
    if (!formData.evolutionApiKey) return setError('API Key é obrigatória'), false;
    if (!formData.instanceName) return setError('Nome da instância é obrigatório'), false;
    return true;
  };

  const validateStep2 = () => {
    if (!formData.authPassword || formData.authPassword.length < 4)
      return setError('Senha deve ter pelo menos 4 caracteres'), false;
    if (formData.authPassword !== formData.confirmPassword)
      return setError('As senhas não coincidem'), false;
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evolutionApiUrl: formData.evolutionApiUrl,
          evolutionApiKey: formData.evolutionApiKey,
          authPassword: formData.authPassword,
          warmingEnabled: formData.warmingEnabled,
          warmingIntervalMinutes: formData.warmingIntervalMinutes,
          warmingMessage: formData.warmingMessage,
          instanceName: formData.instanceName,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar configuração');
      }
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS.find((s) => s.id === step)!;

  if (setupStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-2xl font-bold text-foreground">EEL Setup</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Verificando se este ambiente ainda precisa de configuração inicial.
          </p>
        </div>
      </div>
    );
  }

  if (setupStatus === 'configured') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8">
          <div className="text-2xl font-bold text-foreground">Ambiente já configurado</div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            O setup inicial foi concluído neste ambiente. A rota <span className="text-foreground">/setup</span> não
            aceita reconfiguração para evitar sobrescrever a operação em andamento.
          </p>
          {configuredInstanceName && (
            <div className="mt-5 rounded-xl border border-border bg-muted/50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Instância configurada</div>
              <div className="mt-1 text-sm font-medium text-foreground">{configuredInstanceName}</div>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex-1 h-11 rounded-lg bg-primary text-foreground text-sm font-medium border-none cursor-pointer hover:bg-primary/90 transition-colors"
            >
              Ir para login
            </button>
            <button
              type="button"
              onClick={() => void checkSetupStatus()}
              className="flex-1 h-11 rounded-lg border border-input bg-transparent text-muted-foreground text-sm cursor-pointer hover:border-input"
            >
              Reverificar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (setupStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-2xl font-bold text-foreground">Falha ao verificar setup</div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {error || 'Não foi possível confirmar se o ambiente já está configurado.'}
          </p>
          <button
            type="button"
            onClick={() => void checkSetupStatus()}
            className="mt-6 h-11 w-full rounded-lg bg-primary text-foreground text-sm font-medium border-none cursor-pointer hover:bg-primary/90 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 gap-6">
        <div>
          <div className="text-[48px] font-bold text-foreground leading-none">EEL</div>
          <div className="text-lg text-muted-foreground mt-1">WhatsApp Manager</div>
        </div>
        <p className="text-sm text-muted-foreground/60 max-w-xs leading-relaxed">
          Configure o sistema em 3 passos simples para começar a gerenciar seus chips WhatsApp.
        </p>
        {/* Step progress */}
        <div className="flex flex-col gap-3 mt-4">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 border ${
                  s.id < step
                    ? 'bg-green-600 border-green-600 text-foreground'
                    : s.id === step
                    ? 'border-primary text-primary'
                    : 'border-input text-muted-foreground/50'
                }`}
              >
                {s.id < step ? '✓' : s.id}
              </div>
              <span
                className={`text-xs ${
                  s.id === step ? 'text-foreground font-medium' : s.id < step ? 'text-muted-foreground/70' : 'text-muted-foreground/30'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 flex flex-col gap-6">
          {/* Mobile brand */}
          <div className="lg:hidden text-center">
            <div className="text-2xl font-bold text-foreground">EEL Setup</div>
          </div>

          {/* Step header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-primary font-medium">PASSO {step} DE 3</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">{currentStep.title}</h1>
            <p className="text-sm text-muted-foreground/70 mt-1">{currentStep.description}</p>
          </div>

          {/* Step 1: API */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground font-medium">Nome da Instância</label>
                <input
                  type="text"
                  value={formData.instanceName}
                  onChange={(e) => handleChange('instanceName', e.target.value)}
                  placeholder="eel-instance"
                  className="h-11 rounded-lg border border-input bg-muted text-foreground text-sm px-3 outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground font-medium">URL da Evolution API</label>
                <input
                  type="url"
                  value={formData.evolutionApiUrl}
                  onChange={(e) => handleChange('evolutionApiUrl', e.target.value)}
                  placeholder="https://evolution-api.seu-servidor.com"
                  className="h-11 rounded-lg border border-input bg-muted text-foreground text-sm px-3 outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground font-medium">API Key</label>
                <div className="flex h-11 items-center border border-input bg-muted rounded-lg px-3 gap-2 focus-within:border-primary">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.evolutionApiKey}
                    onChange={(e) => handleChange('evolutionApiKey', e.target.value)}
                    placeholder="Sua API key"
                    className="flex-1 border-none outline-none text-sm text-foreground bg-transparent placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-primary border-none bg-transparent cursor-pointer shrink-0"
                  >
                    {showApiKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground font-medium">Senha de Acesso</label>
                <input
                  type="password"
                  value={formData.authPassword}
                  onChange={(e) => handleChange('authPassword', e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="h-11 rounded-lg border border-input bg-muted text-foreground text-sm px-3 outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground font-medium">Confirmar Senha</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repita a senha"
                  className="h-11 rounded-lg border border-input bg-muted text-foreground text-sm px-3 outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Step 3: Warming */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground font-medium">Aquecimento Automático</div>
                  <div className="text-[11px] text-muted-foreground/70 mt-0.5">Ativar envio automático via cron</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('warmingEnabled', !formData.warmingEnabled)}
                  className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors ${
                    formData.warmingEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      formData.warmingEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {formData.warmingEnabled && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Intervalo (minutos)</label>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={formData.warmingIntervalMinutes}
                      onChange={(e) => handleChange('warmingIntervalMinutes', parseInt(e.target.value) || 60)}
                      className="h-11 w-32 rounded-lg border border-input bg-muted text-foreground text-sm px-3 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Mensagem de Aquecimento</label>
                    <textarea
                      value={formData.warmingMessage}
                      onChange={(e) => handleChange('warmingMessage', e.target.value)}
                      rows={3}
                      className="rounded-lg border border-input bg-muted text-foreground text-sm px-3 py-2 outline-none resize-none focus:border-primary"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setError(''); setStep(step - 1); }}
                className="h-11 px-5 rounded-lg border border-input bg-transparent text-muted-foreground text-sm cursor-pointer hover:border-input"
              >
                Voltar
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 rounded-lg bg-primary text-foreground text-sm font-medium border-none cursor-pointer hover:bg-primary/90 transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-11 rounded-lg bg-green-600 text-foreground text-sm font-medium border-none cursor-pointer disabled:opacity-50 hover:bg-green-700 transition-colors"
              >
                {loading ? 'Salvando...' : '✓ Finalizar Configuração'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
