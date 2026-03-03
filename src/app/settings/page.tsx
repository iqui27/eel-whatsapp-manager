'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';

interface Settings {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instanceName: string;
  warmingEnabled: boolean;
  warmingIntervalMinutes: number;
  warmingMessage: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    evolutionApiUrl: '',
    evolutionApiKey: '',
    instanceName: '',
    warmingEnabled: true,
    warmingIntervalMinutes: 60,
    warmingMessage: '🔔 Aquecimento ativado!',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Erro ao salvar configurações.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', { method: 'POST' });
      const data = await res.json();
      setStatusMsg({
        type: data.success ? 'success' : 'error',
        text: data.message,
      });
    } catch {
      setStatusMsg({ type: 'error', text: 'Não foi possível testar a conexão.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout currentPage="settings">
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="settings">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-[24px] text-[#18181B] font-sans">Configurações</h1>
          <p className="text-[14px] mt-1 text-[#71717A]">Gerencie as configurações do sistema</p>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-[14px] ${
              statusMsg.type === 'success'
                ? 'bg-[#f0fdf4] border border-[#86efac] text-[#166534]'
                : 'bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b]'
            }`}
          >
            <span>{statusMsg.type === 'success' ? '✅' : '❌'}</span>
            {statusMsg.text}
          </div>
        )}

        {/* API Settings Card */}
        <div className="flex flex-col gap-5 bg-white border border-solid border-[#E4E4E7] rounded-xl p-6">
          <div className="text-[16px] font-semibold text-[#18181B]">Configurações da API</div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[#52525B] font-medium">URL da Evolution API</label>
              <input
                type="url"
                value={settings.evolutionApiUrl}
                onChange={(e) => setSettings({ ...settings, evolutionApiUrl: e.target.value })}
                placeholder="https://api.evolution.example.com"
                className="h-10 rounded-lg border border-solid border-[#E4E4E7] px-3 text-[14px] text-[#18181B] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[#52525B] font-medium">API Key</label>
              <div className="flex h-10 items-center border border-solid border-[#E4E4E7] rounded-lg px-3 gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.evolutionApiKey}
                  onChange={(e) => setSettings({ ...settings, evolutionApiKey: e.target.value })}
                  placeholder="Sua API key"
                  className="flex-1 border-none outline-none text-[14px] text-[#18181B] bg-transparent"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[12px] text-[#3B82F6] border-none bg-transparent cursor-pointer"
                >
                  {showApiKey ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[#52525B] font-medium">Nome da Instância</label>
              <input
                type="text"
                value={settings.instanceName}
                onChange={(e) => setSettings({ ...settings, instanceName: e.target.value })}
                placeholder="minha-instancia"
                className="h-10 rounded-lg border border-solid border-[#E4E4E7] px-3 text-[14px] text-[#18181B] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        {/* Warming Settings Card */}
        <div className="flex flex-col gap-5 bg-white border border-solid border-[#E4E4E7] rounded-xl p-6">
          <div className="text-[16px] font-semibold text-[#18181B]">Configurações de Aquecimento</div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-medium text-[#18181B]">Aquecimento Automático</div>
                <div className="text-[13px] text-[#71717A] mt-0.5">Enviar mensagens automaticamente pelo cron</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, warmingEnabled: !settings.warmingEnabled })}
                className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors ${
                  settings.warmingEnabled ? 'bg-[#3B82F6]' : 'bg-[#E4E4E7]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    settings.warmingEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[#52525B] font-medium">Intervalo entre mensagens (minutos)</label>
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.warmingIntervalMinutes}
                onChange={(e) => setSettings({ ...settings, warmingIntervalMinutes: Number(e.target.value) })}
                className="h-10 w-40 rounded-lg border border-solid border-[#E4E4E7] px-3 text-[14px] text-[#18181B] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[#52525B] font-medium">Mensagem de Aquecimento</label>
              <textarea
                value={settings.warmingMessage}
                onChange={(e) => setSettings({ ...settings, warmingMessage: e.target.value })}
                rows={3}
                className="rounded-lg border border-solid border-[#E4E4E7] px-3 py-2 text-[14px] text-[#18181B] outline-none resize-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-10 items-center rounded-lg px-5 gap-2 bg-[#3B82F6] text-white text-[14px] font-medium border-none cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex h-10 items-center rounded-lg px-5 gap-2 bg-white text-[#71717A] text-[14px] border border-solid border-[#E4E4E7] cursor-pointer disabled:opacity-60"
          >
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}
