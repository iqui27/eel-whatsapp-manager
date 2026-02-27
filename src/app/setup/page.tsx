'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.evolutionApiUrl) {
      setError('URL da Evolution API é obrigatória');
      return false;
    }
    if (!formData.evolutionApiKey) {
      setError('API Key é obrigatória');
      return false;
    }
    if (!formData.instanceName) {
      setError('Nome da instância é obrigatório');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.authPassword || formData.authPassword.length < 4) {
      setError('Senha deve ter pelo menos 4 caracteres');
      return false;
    }
    if (formData.authPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/setup', {
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar configuração');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Setup EEL</CardTitle>
          <CardDescription>
            {step === 1 && 'Configure a conexão com a Evolution API'}
            {step === 2 && 'Defina uma senha de acesso'}
            {step === 3 && 'Configure o sistema de aquecimento'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome da Instância</Label>
                <Input
                  id="instanceName"
                  value={formData.instanceName}
                  onChange={e => handleChange('instanceName', e.target.value)}
                  placeholder="eel-instance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evolutionApiUrl">URL da Evolution API</Label>
                <Input
                  id="evolutionApiUrl"
                  value={formData.evolutionApiUrl}
                  onChange={e => handleChange('evolutionApiUrl', e.target.value)}
                  placeholder="https://evolution-api.seu-servidor.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evolutionApiKey">API Key</Label>
                <Input
                  id="evolutionApiKey"
                  type="password"
                  value={formData.evolutionApiKey}
                  onChange={e => handleChange('evolutionApiKey', e.target.value)}
                  placeholder="Sua API key"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authPassword">Senha de Acesso</Label>
                <Input
                  id="authPassword"
                  type="password"
                  value={formData.authPassword}
                  onChange={e => handleChange('authPassword', e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="warmingEnabled">Ativar Aquecimento</Label>
                <Switch
                  id="warmingEnabled"
                  checked={formData.warmingEnabled}
                  onCheckedChange={checked => handleChange('warmingEnabled', checked)}
                />
              </div>
              {formData.warmingEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="warmingIntervalMinutes">Intervalo (minutos)</Label>
                    <Input
                      id="warmingIntervalMinutes"
                      type="number"
                      min={1}
                      value={formData.warmingIntervalMinutes}
                      onChange={e => handleChange('warmingIntervalMinutes', parseInt(e.target.value) || 60)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warmingMessage">Mensagem</Label>
                    <Input
                      id="warmingMessage"
                      value={formData.warmingMessage}
                      onChange={e => handleChange('warmingMessage', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button className="flex-1" onClick={handleNext}>
                Próximo
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvando...' : 'Finalizar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
