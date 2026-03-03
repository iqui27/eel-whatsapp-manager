'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SidebarLayout from '@/components/SidebarLayout';

interface Chip {
  id: string;
  name: string;
  phone: string;
  instanceName?: string;
  groupId?: string;
  clusterIds?: string[];
  enabled: boolean;
  lastWarmed?: string;
  status: 'connected' | 'disconnected' | 'warming';
  warmCount?: number;
}

interface Contact {
  id: string;
}

interface Cluster {
  id: string;
  name: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  chipName: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [chips, setChips] = useState<Chip[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [lastLog, setLastLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChip, setNewChip] = useState({ name: '', phone: '', instanceName: '', groupId: '', clusterIds: [] as string[] });
  const [addingChip, setAddingChip] = useState(false);
  const [warmingAll, setWarmingAll] = useState(false);
  const [warmingId, setWarmingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError(null);
    try {
      const [chipsRes, logsRes, contactsRes, clustersRes] = await Promise.all([
        fetch('/api/chips'),
        fetch('/api/logs'),
        fetch('/api/contacts'),
        fetch('/api/clusters'),
      ]);

      if (!chipsRes.ok) {
        if (chipsRes.status === 401) { router.push('/login'); return; }
        throw new Error('Falha ao carregar chips');
      }
      if (!logsRes.ok) {
        if (logsRes.status === 401) { router.push('/login'); return; }
        throw new Error('Falha ao carregar logs');
      }
      if (!contactsRes.ok) {
        if (contactsRes.status === 401) { router.push('/login'); return; }
        throw new Error('Falha ao carregar contatos');
      }
      if (!clustersRes.ok) {
        if (clustersRes.status === 401) { router.push('/login'); return; }
        throw new Error('Falha ao carregar clusters');
      }

      const chipsData: Chip[] = await chipsRes.json();
      const logsData: LogEntry[] = await logsRes.json();
      const contactsData: Contact[] = await contactsRes.json();
      const clustersData: Cluster[] = await clustersRes.json();

      setChips(chipsData);
      setContacts(contactsData);
      setClusters(clustersData);
      setLastLog(logsData.length > 0 ? logsData[logsData.length - 1] : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChip = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingChip(true);
    try {
      const res = await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChip),
      });
      if (res.ok) {
        setNewChip({ name: '', phone: '', instanceName: '', groupId: '', clusterIds: [] });
        setShowAddForm(false);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao adicionar chip');
      }
    } catch {
      setError('Erro ao adicionar chip');
    } finally {
      setAddingChip(false);
    }
  };

  const handleToggleChip = async (chip: Chip) => {
    try {
      await fetch('/api/chips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chip.id, updates: { enabled: !chip.enabled } }),
      });
      fetchData();
    } catch {
      setError('Erro ao atualizar chip');
    }
  };

  const handleDeleteChip = async (id: string, name: string) => {
    if (!window.confirm(`Excluir o chip "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await fetch(`/api/chips?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch {
      setError('Erro ao deletar chip');
    }
  };

  const handleWarmChip = async (id: string) => {
    setWarmingId(id);
    try {
      const res = await fetch('/api/warming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao aquecer chip');
      }
      fetchData();
    } catch {
      setError('Erro ao aquecer chip');
    } finally {
      setWarmingId(null);
    }
  };

  const handleWarmAll = async () => {
    setWarmingAll(true);
    try {
      const res = await fetch('/api/warming', { method: 'GET' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao aquecer chips');
      }
      fetchData();
    } catch {
      setError('Erro ao aquecer chips');
    } finally {
      setWarmingAll(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-[#22c55e]';
      case 'disconnected': return 'bg-[#ef4444]';
      case 'warming': return 'bg-[#eab308]';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Nunca';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? 's' : ''} atrás`;
  };

  const totalChips = chips.length;
  const totalContacts = contacts.length;
  const totalClusters = clusters.length;
  const activeChips = chips.filter(c => c.enabled).length;
  const warmingToday = chips.reduce((acc, c) => acc + (c.warmCount || 0), 0);
  const ultimaAtividade = lastLog ? formatDate(lastLog.timestamp) : '—';

  if (loading) {
    return (
      <SidebarLayout currentPage="dashboard">
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="dashboard">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[24px] text-[#18181b] font-bold">Dashboard</h1>
            <p className="text-[14px] text-[#71717a] mt-1">Visão geral dos seus chips WhatsApp</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3">
            <span className="text-[#ef4444] text-[14px]">⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-[#ef4444] text-[18px] border-none bg-transparent cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-4">
          <div className="w-[180px] h-[100px] flex flex-col rounded-lg gap-2 bg-white shadow-sm p-4">
            <span className="text-[20px]">📱</span>
            <span className="text-[28px] text-[#18181b] font-bold">{totalChips}</span>
            <span className="text-[12px] text-[#71717a]">Total de Chips</span>
          </div>
          <div className="w-[180px] h-[100px] flex flex-col rounded-lg gap-2 bg-white shadow-sm p-4">
            <span className="text-[20px]">✅</span>
            <span className="text-[28px] text-[#22c55e] font-bold">{activeChips}</span>
            <span className="text-[12px] text-[#71717a]">Chips Ativos</span>
          </div>
          <div className="w-[180px] h-[100px] flex flex-col rounded-lg gap-2 bg-white shadow-sm p-4">
            <span className="text-[20px]">🔥</span>
            <span className="text-[28px] text-[#f97316] font-bold">{warmingToday}</span>
            <span className="text-[12px] text-[#71717a]">Aquecimentos Totais</span>
          </div>
          <div className="w-[180px] h-[100px] flex flex-col rounded-lg gap-2 bg-white shadow-sm p-4">
            <span className="text-[20px]">⏰</span>
            <span className="text-[18px] text-[#18181b] font-bold leading-tight mt-1">{ultimaAtividade}</span>
            <span className="text-[12px] text-[#71717a]">Última Atividade</span>
          </div>
          <div className="w-[180px] h-[100px] flex flex-col rounded-lg gap-2 bg-white shadow-sm p-4">
            <span className="text-[20px]">👥</span>
            <span className="text-[28px] text-[#18181b] font-bold">{totalContacts}</span>
            <span className="text-[12px] text-[#71717a]">Contatos</span>
          </div>
          <div className="w-[180px] h-[100px] flex flex-col rounded-lg gap-2 bg-white shadow-sm p-4">
            <span className="text-[20px]">🧩</span>
            <span className="text-[28px] text-[#18181b] font-bold">{totalClusters}</span>
            <span className="text-[12px] text-[#71717a]">Clusters</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleWarmAll}
            disabled={warmingAll}
            className="flex items-center rounded-lg py-2.5 px-4 gap-2 bg-[#f97316] text-white border-none text-[14px] font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {warmingAll ? '⏳ Aquecendo...' : '🔥 Aquecer Todos'}
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center rounded-lg py-2.5 px-4 gap-2 bg-[#3b82f6] text-white border-none text-[14px] font-medium cursor-pointer"
          >
            + Adicionar Chip
          </button>
          <a
            href="/settings"
            className="flex items-center rounded-lg py-2.5 px-4 gap-2 bg-[#f4f4f5] text-[#18181b] border-none text-[14px] font-medium cursor-pointer no-underline"
          >
            ⚙️ Configurações
          </a>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Novo Chip</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddChip} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={newChip.name}
                      onChange={e => setNewChip({ ...newChip, name: e.target.value })}
                      placeholder="Chip 1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={newChip.phone}
                      onChange={e => setNewChip({ ...newChip, phone: e.target.value })}
                      placeholder="5511999999999"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instância Evolution API</Label>
                    <Input
                      value={newChip.instanceName}
                      onChange={e => setNewChip({ ...newChip, instanceName: e.target.value })}
                      placeholder="Marcela1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ID do Grupo (opcional)</Label>
                    <Input
                      value={newChip.groupId}
                      onChange={e => setNewChip({ ...newChip, groupId: e.target.value })}
                      placeholder="ID do grupo"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Clusters</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border border-[#e4e4e7] p-3 bg-white">
                    {clusters.map((cluster) => {
                      const checked = newChip.clusterIds.includes(cluster.id);
                      return (
                        <label
                          key={cluster.id}
                          className={`text-[13px] px-2 py-1 rounded-md border cursor-pointer ${checked ? 'bg-[#dbeafe] border-[#93c5fd] text-[#1d4ed8]' : 'bg-white border-[#e4e4e7] text-[#52525b]'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setNewChip((prev) => ({
                              ...prev,
                              clusterIds: checked
                                ? prev.clusterIds.filter((id) => id !== cluster.id)
                                : [...prev.clusterIds, cluster.id],
                            }))}
                            className="hidden"
                          />
                          {cluster.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Button type="submit" disabled={addingChip}>
                  {addingChip ? 'Salvando...' : 'Salvar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-[18px] text-[#18181b] font-semibold mb-4">Chips Cadastrados</h2>
          <div className="flex flex-wrap gap-4">
            {chips.map(chip => (
              <div 
                key={chip.id} 
                className={`w-[260px] h-[220px] flex flex-col rounded-xl gap-3 bg-white shadow-sm p-4 ${!chip.enabled ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[16px] text-[#18181b] font-semibold">{chip.name}</h3>
                    <p className="text-[12px] text-[#71717a] mt-0.5">{chip.phone}</p>
                  </div>
                  <div className={`rounded-full ${getStatusColor(chip.status)} w-3 h-3`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-[#71717a]">Último: {formatDate(chip.lastWarmed)}</span>
                  <span className="text-[12px] text-[#71717a]">Próximo: --</span>
                  <span className="text-[12px] text-[#71717a]">Aquecimentos: {chip.warmCount || 0}</span>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={chip.enabled}
                      onCheckedChange={() => handleToggleChip(chip)}
                    />
                    <Label className="text-[12px]">{chip.enabled ? 'Ativo' : 'Inativo'}</Label>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleWarmChip(chip.id)}
                      disabled={!chip.enabled || warmingId === chip.id}
                      className="rounded-lg bg-[#fff7ed] w-9 h-9 flex items-center justify-center border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {warmingId === chip.id ? '⏳' : '🔥'}
                    </button>
                    <button 
                      onClick={() => handleDeleteChip(chip.id, chip.name)}
                      className="rounded-lg bg-[#fef2f2] w-9 h-9 flex items-center justify-center border-none cursor-pointer text-[#ef4444]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {chips.length === 0 && (
            <div className="text-center py-12 text-[#71717a]">
              <p>Nenhum chip cadastrado</p>
              <p className="text-[14px]">Clique em "Adicionar Chip" para começar</p>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <p className="text-[12px] text-center text-[#a1a1aa]">
            EEL v1.0.0 • Dashboard de Gerenciamento de Chips WhatsApp
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
