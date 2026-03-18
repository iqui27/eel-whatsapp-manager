'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Users,
  Smartphone,
} from 'lucide-react';
import {
  loadWizardState,
  saveWizardState,
  type WizardState,
  validateStep,
  markStepCompleted,
  getNextStep,
} from '@/lib/setup-wizard';
import { cn } from '@/lib/utils';
import type { Segment, Chip } from '@/db/schema';

interface SegmentFormItem {
  id?: string;
  name: string;
  segmentTag: string;
  voterCount: number;
  chipId: string | null;
  isNew: boolean;
}

export default function WizardSegmentsPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [formItems, setFormItems] = useState<SegmentFormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      const loaded = loadWizardState();
      setState(loaded);
      
      try {
        const [segmentsRes, chipsRes] = await Promise.all([
          fetch('/api/segments'),
          fetch('/api/chips'),
        ]);
        
        if (segmentsRes.ok) {
          const segmentsData: Segment[] = await segmentsRes.json();
          setSegments(segmentsData);
          
          // Initialize form items from existing segments
          setFormItems(segmentsData.map(s => ({
            id: s.id,
            name: s.name,
            segmentTag: s.segmentTag || '',
            voterCount: s.audienceCount || 0,
            chipId: null, // Will be set from chips
            isNew: false,
          })));
        }
        
        if (chipsRes.ok) {
          setChips(await chipsRes.json());
        }
      } catch (err) {
        console.error('Failed to load data:', err);
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
  
  // Auto-detect segments from import tags
  const autoDetectFromImport = useCallback(async () => {
    if (!state?.import.tags.length) {
      toast.error('Nenhuma tag detectada na importação');
      return;
    }
    
    setDetecting(true);
    
    try {
      // Create segments from detected tags
      const newItems: SegmentFormItem[] = state.import.tags.map(tag => ({
        name: tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        segmentTag: tag,
        voterCount: 0, // Will be calculated
        chipId: null,
        isNew: true,
      }));
      
      // Get voter counts for each tag
      for (const item of newItems) {
        try {
          const res = await fetch(`/api/segments?action=preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: {
                operator: 'AND',
                filters: [{ id: '1', key: 'tags', value: [item.segmentTag] }],
              },
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            item.voterCount = data.count || 0;
          }
        } catch {
          // Ignore errors
        }
      }
      
      setFormItems(prev => {
        // Merge with existing, avoiding duplicates
        const existingTags = new Set(prev.map(p => p.segmentTag));
        const toAdd = newItems.filter(n => !existingTags.has(n.segmentTag));
        return [...prev, ...toAdd];
      });
      
      toast.success(`${newItems.length} segmentos detectados`);
    } catch (err) {
      toast.error('Erro ao detectar segmentos');
    } finally {
      setDetecting(false);
    }
  }, [state]);
  
  const addSegment = () => {
    setFormItems(prev => [...prev, {
      name: '',
      segmentTag: '',
      voterCount: 0,
      chipId: null,
      isNew: true,
    }]);
  };
  
  const removeSegment = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateSegment = (index: number, field: keyof SegmentFormItem, value: string | number | null) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-generate tag from name
      if (field === 'name' && !item.segmentTag) {
        const tagValue = value?.toString() || '';
        updated.segmentTag = tagValue
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 50);
      }
      
      return updated;
    }));
  };
  
  const saveSegments = async () => {
    setSaving(true);
    
    try {
      const savedItems: SegmentFormItem[] = [];
      
      for (const item of formItems) {
        if (!item.name.trim() || !item.segmentTag.trim()) continue;
        
        const payload = {
          name: item.name.trim(),
          segmentTag: item.segmentTag.trim(),
          filters: {
            operator: 'AND',
            filters: item.segmentTag ? [{ id: '1', key: 'tags', value: [item.segmentTag] }] : [],
          },
          audienceCount: item.voterCount,
        };
        
        let res;
        if (item.id && !item.isNew) {
          res = await fetch('/api/segments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, ...payload }),
          });
        } else {
          res = await fetch('/api/segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
        
        if (res.ok) {
          const saved: Segment = await res.json();
          savedItems.push({
            id: saved.id,
            name: saved.name,
            segmentTag: saved.segmentTag || '',
            voterCount: saved.audienceCount || 0,
            chipId: item.chipId,
            isNew: false,
          });
        }
      }
      
      // Update chip segment assignments
      for (const item of savedItems) {
        if (item.chipId && item.segmentTag) {
          try {
            await fetch('/api/chips', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: item.chipId,
                updates: {
                  assignedSegments: [item.segmentTag],
                },
              }),
            });
          } catch {
            // Ignore errors
          }
        }
      }
      
      // Update wizard state
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          segments: {
            items: savedItems.map(item => ({
              id: item.id || '',
              name: item.name,
              segmentTag: item.segmentTag,
              voterCount: item.voterCount,
              chipId: item.chipId,
            })),
            autoDetected: (state?.import.tags?.length ?? 0) > 0,
          },
        };
      });
      
      setFormItems(savedItems);
      toast.success('Segmentos salvos');
    } catch (err) {
      toast.error('Erro ao salvar segmentos');
    } finally {
      setSaving(false);
    }
  };
  
  const handleContinue = async () => {
    if (!state) return;
    
    // Save first
    await saveSegments();
    
    const validation = validateStep(state, 'segments');
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    const newState = markStepCompleted(state, 'segments');
    setState(newState);
    
    const nextStep = getNextStep('segments');
    if (nextStep) {
      router.push(`/wizard/${nextStep}`);
    }
  };
  
  const connectedChips = chips.filter(c => c.status === 'connected');
  const totalVoters = formItems.reduce((sum, item) => sum + item.voterCount, 0);
  const validSegments = formItems.filter(item => item.name.trim() && item.segmentTag.trim());
  
  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Target className="h-6 w-6" />
          Criar Segmentos
        </h2>
        <p className="text-muted-foreground">
          Organize seus eleitores em segmentos para facilitar o envio de campanhas.
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold">{validSegments.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Segmentos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold">{totalVoters.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Eleitores</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold">{connectedChips.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Chips Disponíveis</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Auto-detect from import */}
      {state.import.tags.length > 0 && (
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Tags Detectadas na Importação</p>
                  <p className="text-sm text-muted-foreground">
                    {state.import.tags.length} tags encontradas: {state.import.tags.slice(0, 5).join(', ')}
                    {state.import.tags.length > 5 && ` +${state.import.tags.length - 5} mais`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={autoDetectFromImport}
                disabled={detecting}
              >
                {detecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Criar Segmentos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Segment list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Segmentos</CardTitle>
            <Button variant="outline" size="sm" onClick={addSegment}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum segmento criado ainda.</p>
              <p className="text-sm">Clique em "Adicionar" ou use a detecção automática.</p>
            </div>
          ) : (
            formItems.map((item, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-3 p-3 rounded-lg border"
              >
                <div className="flex-1 min-w-[150px]">
                  <Input
                    placeholder="Nome do segmento"
                    value={item.name}
                    onChange={e => updateSegment(index, 'name', e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <Input
                    placeholder="Tag"
                    value={item.segmentTag}
                    onChange={e => updateSegment(index, 'segmentTag', e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    <Users className="h-3 w-3 mr-1" />
                    {item.voterCount.toLocaleString()}
                  </Badge>
                </div>
                <div className="w-48">
                  <Select
                    value={item.chipId || '__none__'}
                    onValueChange={v => updateSegment(index, 'chipId', v === '__none__' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Atribuir chip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {connectedChips.map(chip => (
                        <SelectItem key={chip.id} value={chip.id}>
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-3 w-3" />
                            {chip.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSegment(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={() => router.push('/wizard/import')}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveSegments} disabled={saving || validSegments.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
          <Button onClick={handleContinue} disabled={validSegments.length === 0}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}