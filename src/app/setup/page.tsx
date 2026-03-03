'use client';

import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
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
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS.find((s) => s.id === step)!;

  return (
    <div className="min-h-screen flex bg-[#0B1220]">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 gap-6">
        <div>
          <div className="text-[48px] font-bold text-white leading-none">EEL</div>
          <div className="text-[18px] text-[#A1A1AA] mt-1">WhatsApp Manager</div>
        </div>
        <p className="text-[14px] text-[#52525B] max-w-xs leading-relaxed">
          Configure o sistema em 3 passos simples para começar a gerenciar seus chips WhatsApp.
        </p>
        {/* Step progress */}
        <div className="flex flex-col gap-3 mt-4">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 border ${
                  s.id < step
                    ? 'bg-[#22C55E] border-[#22C55E] text-white'
                    : s.id === step
                    ? 'border-[#3B82F6] text-[#3B82F6]'
                    : 'border-[#374151] text-[#4B5563]'
                }`}
              >
                {s.id < step ? '✓' : s.id}
              </div>
              <span
                className={`text-[13px] ${
                  s.id === step ? 'text-white font-medium' : s.id < step ? 'text-[#71717A]' : 'text-[#374151]'
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
        <div className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl p-8 flex flex-col gap-6">
          {/* Mobile brand */}
          <div className="lg:hidden text-center">
            <div className="text-[28px] font-bold text-white">EEL Setup</div>
          </div>

          {/* Step header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] text-[#3B82F6] font-medium">PASSO {step} DE 3</span>
            </div>
            <h1 className="text-[22px] font-semibold text-white">{currentStep.title}</h1>
            <p className="text-[14px] text-[#71717A] mt-1">{currentStep.description}</p>
          </div>

          {/* Step 1: API */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-[#A1A1AA] font-medium">Nome da Instância</label>
                <input
                  type="text"
                  value={formData.instanceName}
                  onChange={(e) => handleChange('instanceName', e.target.value)}
                  placeholder="eel-instance"
                  className="h-11 rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 outline-none focus:border-[#3B82F6] placeholder:text-[#4B5563]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-[#A1A1AA] font-medium">URL da Evolution API</label>
                <input
                  type="url"
                  value={formData.evolutionApiUrl}
                  onChange={(e) => handleChange('evolutionApiUrl', e.target.value)}
                  placeholder="https://evolution-api.seu-servidor.com"
                  className="h-11 rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 outline-none focus:border-[#3B82F6] placeholder:text-[#4B5563]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-[#A1A1AA] font-medium">API Key</label>
                <div className="flex h-11 items-center border border-[#374151] bg-[#1F2937] rounded-lg px-3 gap-2 focus-within:border-[#3B82F6]">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.evolutionApiKey}
                    onChange={(e) => handleChange('evolutionApiKey', e.target.value)}
                    placeholder="Sua API key"
                    className="flex-1 border-none outline-none text-[14px] text-white bg-transparent placeholder:text-[#4B5563]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[12px] text-[#3B82F6] border-none bg-transparent cursor-pointer shrink-0"
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
                <label className="text-[13px] text-[#A1A1AA] font-medium">Senha de Acesso</label>
                <input
                  type="password"
                  value={formData.authPassword}
                  onChange={(e) => handleChange('authPassword', e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="h-11 rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 outline-none focus:border-[#3B82F6] placeholder:text-[#4B5563]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-[#A1A1AA] font-medium">Confirmar Senha</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repita a senha"
                  className="h-11 rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 outline-none focus:border-[#3B82F6] placeholder:text-[#4B5563]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Warming */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] text-white font-medium">Aquecimento Automático</div>
                  <div className="text-[12px] text-[#71717A] mt-0.5">Ativar envio automático via cron</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('warmingEnabled', !formData.warmingEnabled)}
                  className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors ${
                    formData.warmingEnabled ? 'bg-[#3B82F6]' : 'bg-[#374151]'
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
                    <label className="text-[13px] text-[#A1A1AA] font-medium">Intervalo (minutos)</label>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={formData.warmingIntervalMinutes}
                      onChange={(e) => handleChange('warmingIntervalMinutes', parseInt(e.target.value) || 60)}
                      className="h-11 w-32 rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-[#A1A1AA] font-medium">Mensagem de Aquecimento</label>
                    <textarea
                      value={formData.warmingMessage}
                      onChange={(e) => handleChange('warmingMessage', e.target.value)}
                      rows={3}
                      className="rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 py-2 outline-none resize-none focus:border-[#3B82F6]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-[#EF4444]">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setError(''); setStep(step - 1); }}
                className="h-11 px-5 rounded-lg border border-[#374151] bg-transparent text-[#A1A1AA] text-[14px] cursor-pointer hover:border-[#4B5563]"
              >
                Voltar
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 rounded-lg bg-[#3B82F6] text-white text-[14px] font-medium border-none cursor-pointer hover:bg-[#2563EB] transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-11 rounded-lg bg-[#22C55E] text-white text-[14px] font-medium border-none cursor-pointer disabled:opacity-50 hover:bg-[#16A34A] transition-colors"
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
