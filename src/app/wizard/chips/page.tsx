'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Smartphone,
  QrCode,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  Loader2,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  loadWizardState,
  saveWizardState,
  type WizardState,
  type WizardStep,
  validateStep,
  markStepCompleted,
  getNextStep,
} from '@/lib/setup-wizard';
import { cn } from '@/lib/utils';
import type { Chip, Segment } from '@/db/schema';

interface ChipFormData {
  name: string;
  phone: string;
  instanceName: string;
  segmentTags: string[];
}

export default function WizardChipsPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ChipFormData>({
    name: '',
    phone: '',
    instanceName: '',
    segmentTags: [],
  });
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  
  // Load state and segments
  useEffect(() => {
    const loadData = async () => {
      const loaded = loadWizardState();
      setState(loaded);
      
      try {
        const res = await fetch('/api/segments');
        if (res.ok) {
          setSegments(await res.json());
        }
      } catch (err) {
        console.error('Failed to load segments:', err);
      }
      
      setLoading(false);
    };
    
    loadData();
  }, []);
  
  // Save state when it changes
  useEffect(() => {
    if (state) {
      saveWizardState(state);
    }
  }, [state]);
  
  const handleAddChip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          instanceName: form.instanceName || form.name.toLowerCase().replace(/\s+/g, '_'),
          enabled: true,
          assignedSegments: form.segmentTags.length > 0 ? form.segmentTags : null,
          dailyLimit: 200,
          hourlyLimit: 25,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao adicionar chip');
      }
      
      const newChip: Chip = await res.json();
      
      // Update wizard state
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chips: {
            ...prev.chips,
            configured: [
              ...prev.chips.configured,
              {
                id: newChip.id,
                name: newChip.name,
                phone: newChip.phone,
                instanceName: newChip.instanceName || '',
                segmentTags: form.segmentTags,
                connected: newChip.status === 'connected',
              },
            ],
          },
        };
      });
      
      toast.success('Chip adicionado com sucesso');
      setForm({ name: '', phone: '', instanceName: '', segmentTags: [] });
      setShowAddForm(false);
      
      // Try to get QR code for the new chip
      if (newChip.instanceName) {
        await fetchQRCode(newChip.instanceName);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar chip');
    } finally {
      setSaving(false);
    }
  };
  
  const fetchQRCode = async (instanceName: string) => {
    setQrLoading(true);
    setQrCodeData(null);
    
    try {
      const res = await fetch(`/api/chips/qr?instance=${encodeURIComponent(instanceName)}`);
      if (res.ok) {
        const data = await res.json();
        setQrCodeData(data.base64 || data.code || null);
      }
    } catch (err) {
      console.error('Failed to fetch QR code:', err);
    } finally {
      setQrLoading(false);
    }
  };
  
  const testConnection = async (chipId: string, instanceName: string) => {
    setTestingConnection(chipId);
    
    try {
      const res = await fetch('/api/chips/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        
        // Update chip connection status in wizard state
        setState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            chips: {
              ...prev.chips,
              configured: prev.chips.configured.map(c =>
                c.id === chipId ? { ...c, connected: true } : c
              ),
            },
          };
        });
        
        toast.success('Chip conectado com sucesso!');
        setQrCodeData(null);
      } else {
        toast.error('Chip não conectado. Escaneie o QR code.');
        await fetchQRCode(instanceName);
      }
    } catch (err) {
      toast.error('Erro ao verificar conexão');
    } finally {
      setTestingConnection(null);
    }
  };
  
  const removeChip = async (chipId: string) => {
    if (!confirm('Remover este chip?')) return;
    
    try {
      await fetch(`/api/chips?id=${chipId}`, { method: 'DELETE' });
      
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chips: {
            ...prev.chips,
            configured: prev.chips.configured.filter(c => c.id !== chipId),
          },
        };
      });
      
      toast.success('Chip removido');
    } catch (err) {
      toast.error('Erro ao remover chip');
    }
  };
  
  const handleContinue = () => {
    if (!state) return;
    
    const validation = validateStep(state, 'chips');
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    const newState = markStepCompleted(state, 'chips');
    setState(newState);
    
    const nextStep = getNextStep('chips');
    if (nextStep) {
      router.push(`/wizard/${nextStep}`);
    }
  };
  
  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const connectedChips = state.chips.configured.filter(c => c.connected);
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          Configurar Chips
        </h2>
        <p className="text-muted-foreground">
          Adicione e conecte seus chips WhatsApp para enviar mensagens.
        </p>
      </div>
      
      {/* Connected chips status */}
      {state.chips.configured.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chips Configurados</CardTitle>
            <CardDescription>
              {connectedChips.length} de {state.chips.configured.length} conectado(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.chips.configured.map((chip) => (
              <div
                key={chip.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  chip.connected ? 'border-green-500/50 bg-green-50/50' : 'border-border',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    chip.connected ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground',
                  )}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{chip.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{chip.phone}</p>
                  </div>
                  {chip.segmentTags.length > 0 && (
                    <div className="flex gap-1">
                      {chip.segmentTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {chip.connected ? (
                    <Badge className="bg-green-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => chip.instanceName && fetchQRCode(chip.instanceName)}
                        disabled={qrLoading}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(chip.id, chip.instanceName)}
                        disabled={testingConnection === chip.id}
                      >
                        {testingConnection === chip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChip(chip.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* QR Code display */}
      {qrCodeData && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Escaneie o QR Code
            </CardTitle>
            <CardDescription>
              Abra o WhatsApp no seu celular e escaneie o código para conectar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {qrCodeData.startsWith('data:') ? (
              <img
                src={qrCodeData}
                alt="QR Code"
                className="w-64 h-64 rounded-lg border"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg border font-mono text-lg text-center p-4">
                {qrCodeData}
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              O código expira em alguns minutos. Atualize se necessário.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Add chip form */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {showAddForm ? 'Novo Chip' : 'Adicionar Chip'}
            </CardTitle>
            {!showAddForm && (
              <Button variant="outline" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4">
            <form onSubmit={handleAddChip} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nome</label>
                  <Input
                    placeholder="Ex: Chip Principal"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Telefone</label>
                  <Input
                    placeholder="5511999999999"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Instância API</label>
                  <Input
                    placeholder="Ex: chip_principal"
                    value={form.instanceName}
                    onChange={e => setForm(f => ({ ...f, instanceName: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Segment assignment */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Segmentos Atribuídos
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-md border border-input bg-background min-h-[50px]">
                  {segments.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum segmento disponível. Crie segmentos na etapa seguinte.
                    </span>
                  ) : (
                    segments.map(segment => {
                      const isSelected = form.segmentTags.includes(segment.segmentTag || '');
                      return (
                        <button
                          key={segment.id}
                          type="button"
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              segmentTags: isSelected
                                ? f.segmentTags.filter(t => t !== segment.segmentTag)
                                : [...f.segmentTags, segment.segmentTag || ''],
                            }));
                          }}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                          )}
                        >
                          {segment.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Salvar Chip
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
      
      {/* Continue button */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={() => router.push('/wizard')}>
          Voltar
        </Button>
        <Button onClick={handleContinue} disabled={connectedChips.length === 0}>
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}