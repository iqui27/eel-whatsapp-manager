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
  UsersRound,
  ArrowRight,
  Loader2,
  ExternalLink,
  Check,
  Copy,
  Smartphone,
  SkipForward,
} from 'lucide-react';
import {
  loadWizardState,
  saveWizardState,
  type WizardState,
  markStepCompleted,
  markStepSkipped,
  getNextStep,
} from '@/lib/setup-wizard';
import { cn } from '@/lib/utils';
import type { Chip, WhatsappGroup } from '@/db/schema';

interface DbSegment {
  id: string;
  name: string;
  segmentTag: string | null;
  audienceCount: number;
}

interface GroupFormItem {
  id?: string;
  name: string;
  segmentTag: string;
  inviteUrl: string | null;
  memberCount: number;
  chipId: string | null;
  loading: boolean;
  created: boolean;
}

function buildFormItems(
  segments: Array<{ name: string; segmentTag: string; chipId: string | null }>,
  existingGroups: WhatsappGroup[],
): GroupFormItem[] {
  const existingByTag = new Map(existingGroups.map((g) => [g.segmentTag, g]));
  return segments.map((segment) => {
    const existing = existingByTag.get(segment.segmentTag);
    return {
      id: existing?.id,
      name: existing?.name || segment.name,
      segmentTag: segment.segmentTag,
      inviteUrl: existing?.inviteUrl || null,
      memberCount: existing?.currentSize || 0,
      chipId: segment.chipId,
      loading: false,
      created: !!existing?.id,
    };
  });
}

export default function WizardGroupsPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [chips, setChips] = useState<Chip[]>([]);
  const [existingGroups, setExistingGroups] = useState<WhatsappGroup[]>([]);
  const [formItems, setFormItems] = useState<GroupFormItem[]>([]);
  const [adminPhones, setAdminPhones] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Load all data once on mount
  useEffect(() => {
    const loadData = async () => {
      const loaded = loadWizardState();
      setState(loaded);

      try {
        const [chipsRes, groupsRes, segmentsRes] = await Promise.all([
          fetch('/api/chips'),
          fetch('/api/groups'),
          fetch('/api/segments'),
        ]);

        const chipsData: Chip[] = chipsRes.ok ? await chipsRes.json() : [];
        setChips(chipsData);

        const groupsData: { groups?: WhatsappGroup[] } | WhatsappGroup[] = groupsRes.ok
          ? await groupsRes.json()
          : [];
        const groups: WhatsappGroup[] = Array.isArray(groupsData)
          ? groupsData
          : (groupsData.groups ?? []);
        setExistingGroups(groups);

        const defaultChipId =
          chipsData.find((c) => c.status === 'connected' && c.enabled)?.id ?? null;

        if (loaded?.segments.items.length) {
          // Wizard flow: use segments from localStorage (they already carry chipId)
          setFormItems(buildFormItems(loaded.segments.items, groups));
        } else if (segmentsRes.ok) {
          // Direct /segmentacao flow: fall back to DB segments
          const dbSegments: DbSegment[] = await segmentsRes.json();
          const segmentsWithTags = dbSegments
            .filter((s): s is DbSegment & { segmentTag: string } => Boolean(s.segmentTag))
            .map((s) => ({ name: s.name, segmentTag: s.segmentTag, chipId: defaultChipId }));
          setFormItems(buildFormItems(segmentsWithTags, groups));
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }

      setLoading(false);
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep wizard-state formItems in sync when existingGroups changes (shouldn't be needed
  // after initial load, but kept for safety)
  useEffect(() => {
    if (!state?.segments.items.length || formItems.length === 0) return;
    setFormItems((prev) => {
      const existingByTag = new Map(existingGroups.map((g) => [g.segmentTag, g]));
      return prev.map((item) => {
        const existing = existingByTag.get(item.segmentTag);
        if (!existing || item.created) return item;
        return {
          ...item,
          id: existing.id,
          inviteUrl: existing.inviteUrl,
          memberCount: existing.currentSize,
          created: true,
        };
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingGroups]);

  // Save state when it changes
  useEffect(() => {
    if (state) {
      saveWizardState(state);
    }
  }, [state]);

  const connectedChips = chips.filter((c) => c.status === 'connected' && c.enabled);

  const updateItemChip = useCallback((index: number, chipId: string) => {
    setFormItems((prev) => prev.map((it, i) => (i === index ? { ...it, chipId } : it)));
  }, []);

  const createGroup = async (index: number) => {
    const item = formItems[index];
    if (!item.chipId) {
      toast.error('Selecione um chip para criar o grupo');
      return;
    }

    const chip = chips.find((c) => c.id === item.chipId);
    if (!chip?.instanceName) {
      toast.error('Chip não tem instância configurada');
      return;
    }

    setFormItems((prev) => prev.map((it, i) => (i === index ? { ...it, loading: true } : it)));

    try {
      const admins = adminPhones
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          segmentTag: item.segmentTag,
          chipId: item.chipId,
          admins,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar grupo');
      }

      const group: WhatsappGroup = await res.json();

      setFormItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? {
                ...it,
                id: group.id,
                inviteUrl: group.inviteUrl,
                memberCount: group.currentSize,
                loading: false,
                created: true,
              }
            : it,
        ),
      );

      toast.success('Grupo criado com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar grupo');
      setFormItems((prev) => prev.map((it, i) => (i === index ? { ...it, loading: false } : it)));
    }
  };

  const createAllGroups = async () => {
    setCreating(true);
    for (let i = 0; i < formItems.length; i++) {
      if (!formItems[i].created && formItems[i].chipId) {
        await createGroup(i);
      }
    }
    setCreating(false);
  };

  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleSkip = () => {
    if (!state) return;
    const newState = markStepSkipped(state, 'groups');
    setState(newState);
    setSkipped(true);
    const nextStep = getNextStep('groups');
    if (nextStep) router.push(`/wizard/${nextStep}`);
  };

  const handleContinue = () => {
    if (!state) return;

    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: {
          items: formItems
            .filter((f) => f.created)
            .map((item) => ({
              id: item.id || '',
              name: item.name,
              segmentTag: item.segmentTag,
              inviteUrl: item.inviteUrl,
              memberCount: item.memberCount,
            })),
          admins: adminPhones.split(/[,\s]+/).filter(Boolean),
        },
      };
    });

    const newState = markStepCompleted(state, 'groups');
    setState(newState);

    const nextStep = getNextStep('groups');
    if (nextStep) router.push(`/wizard/${nextStep}`);
  };

  const createdCount = formItems.filter((f) => f.created).length;
  const allCreated = formItems.length > 0 && createdCount === formItems.length;

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No segments at all
  if (formItems.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="h-6 w-6" />
            Criar Grupos
          </h2>
          <p className="text-muted-foreground">
            Crie grupos WhatsApp para cada segmento com links de convite automáticos.
          </p>
        </div>

        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum segmento encontrado. Crie segmentos em{' '}
              <strong>Segmentação</strong> ou na etapa anterior primeiro.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => router.push('/wizard/segments')}>
                Etapa de Segmentos
              </Button>
              <Button variant="outline" onClick={() => router.push('/segmentacao')}>
                Ir para Segmentação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="h-6 w-6" />
            Criar Grupos
          </h2>
          <Badge variant="secondary">Opcional</Badge>
        </div>
        <p className="text-muted-foreground">
          Crie grupos WhatsApp para cada segmento. Os links de convite podem ser usados nas campanhas.
        </p>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold">{formItems.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Segmentos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold text-green-600">{createdCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Grupos Criados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-semibold">{connectedChips.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Chips Disponíveis</div>
          </CardContent>
        </Card>
      </div>

      {/* Admin phones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Administradores dos Grupos</CardTitle>
          <CardDescription>
            Números que serão adicionados como admin em todos os grupos criados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="5511999999999, 5511888888888"
            value={adminPhones}
            onChange={(e) => setAdminPhones(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Separe múltiplos números por vírgula ou espaço
          </p>
        </CardContent>
      </Card>

      {/* Groups list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Grupos por Segmento</CardTitle>
            {!allCreated && formItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={createAllGroups}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UsersRound className="h-4 w-4 mr-2" />
                )}
                Criar Todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formItems.map((item, index) => (
            <div
              key={item.segmentTag}
              className={cn(
                'flex flex-wrap items-center gap-3 p-3 rounded-lg border',
                item.created && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20',
              )}
            >
              <div className="flex-1 min-w-[150px]">
                <p className="font-medium">{item.name}</p>
                <code className="text-xs text-muted-foreground">{item.segmentTag}</code>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {item.created ? (
                  <>
                    <Badge className="bg-green-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Criado
                    </Badge>
                    {item.inviteUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteUrl(item.inviteUrl!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    {item.inviteUrl && (
                      <a
                        href={item.inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    {/* Chip picker: show Select when multiple chips, plain text otherwise */}
                    {connectedChips.length > 1 ? (
                      <Select
                        value={item.chipId ?? ''}
                        onValueChange={(v) => updateItemChip(index, v)}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs gap-1">
                          <Smartphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <SelectValue placeholder="Selecionar chip..." />
                        </SelectTrigger>
                        <SelectContent>
                          {connectedChips.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Smartphone className="h-4 w-4" />
                        {chips.find((c) => c.id === item.chipId)?.name || 'Sem chip'}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createGroup(index)}
                      disabled={item.loading || !item.chipId}
                    >
                      {item.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={() => router.push('/wizard/segments')}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Pular
          </Button>
          <Button onClick={handleContinue}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
