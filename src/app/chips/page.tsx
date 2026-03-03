'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Cluster {
  id: string;
  name: string;
}

export default function ChipsPage() {
  const router = useRouter();
  const [chips, setChips] = useState<Chip[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChip, setNewChip] = useState({ name: '', phone: '', instanceName: '', groupId: '', clusterIds: [] as string[] });
  const [addingChip, setAddingChip] = useState(false);
  const [warmingId, setWarmingId] = useState<string | null>(null);
  const [editingClustersChipId, setEditingClustersChipId] = useState<string | null>(null);
  const [editingClusterIds, setEditingClusterIds] = useState<string[]>([]);
  const [savingClusters, setSavingClusters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchChips();
    fetchClusters();
  }, []);

  const fetchChips = async () => {
    setError(null);
    try {
      const res = await fetch('/api/chips');
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error('Falha ao carregar chips');
      }
      const data = await res.json();
      setChips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar chips');
    } finally {
      setLoading(false);
    }
  };

  const fetchClusters = async () => {
    try {
      const res = await fetch('/api/clusters');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
        }
        return;
      }
      const data = await res.json() as Cluster[];
      setClusters(data);
    } catch {
      // non-critical
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
        fetchChips();
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
      fetchChips();
    } catch {
      setError('Erro ao atualizar chip');
    }
  };

  const handleDeleteChip = async (id: string, name: string) => {
    if (!window.confirm(`Excluir o chip "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/chips?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao deletar');
      fetchChips();
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
      fetchChips();
    } catch {
      setError('Erro ao aquecer chip');
    } finally {
      setWarmingId(null);
    }
  };

  const openClusterEditor = (chip: Chip) => {
    setEditingClustersChipId(chip.id);
    setEditingClusterIds(chip.clusterIds ?? []);
  };

  const toggleEditingCluster = (clusterId: string) => {
    setEditingClusterIds((prev) => {
      const exists = prev.includes(clusterId);
      return exists ? prev.filter((id) => id !== clusterId) : [...prev, clusterId];
    });
  };

  const saveChipClusters = async () => {
    if (!editingClustersChipId) {
      return;
    }

    setSavingClusters(true);
    try {
      const res = await fetch('/api/chips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClustersChipId,
          updates: { clusterIds: editingClusterIds },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar clusters do chip');
      }

      setEditingClustersChipId(null);
      setEditingClusterIds([]);
      await fetchChips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar clusters do chip');
    } finally {
      setSavingClusters(false);
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

  const filteredChips = chips.filter(chip => {
    const matchesSearch = chip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          chip.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && chip.enabled) ||
                          (statusFilter === 'inactive' && !chip.enabled);
    return matchesSearch && matchesStatus;
  });

  const getClusterNames = (clusterIds?: string[]) => {
    if (!clusterIds || clusterIds.length === 0) {
      return 'Sem cluster';
    }
    const names = clusters
      .filter((cluster) => clusterIds.includes(cluster.id))
      .map((cluster) => cluster.name);
    return names.length > 0 ? names.join(', ') : 'Sem cluster';
  };

  const toggleClusterSelection = (clusterId: string) => {
    setNewChip((prev) => {
      const hasCluster = prev.clusterIds.includes(clusterId);
      return {
        ...prev,
        clusterIds: hasCluster
          ? prev.clusterIds.filter((id) => id !== clusterId)
          : [...prev.clusterIds, clusterId],
      };
    });
  };

  if (loading) {
    return (
      <SidebarLayout currentPage="chips">
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="chips">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[24px] text-[#18181b] font-bold">Chips</h1>
            <p className="text-[14px] text-[#71717a] mt-1">Gerencie seus chips WhatsApp</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center rounded-lg py-2.5 px-4 gap-2 bg-[#3b82f6] text-white border-none text-[14px] font-medium cursor-pointer"
          >
            + Adicionar Chip
          </button>
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

        <div className="flex gap-3">
          <div className="flex h-10 items-center rounded-lg py-2 px-3 gap-2 bg-white border border-solid border-[#e4e4e7]">
            <span className="text-[14px]">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar chips..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none outline-none text-[14px] bg-transparent"
            />
          </div>
          <div className="flex h-10 items-center rounded-lg py-2 px-3 gap-2 bg-white border border-solid border-[#e4e4e7]">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-none outline-none text-[14px] text-[#71717a] bg-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <span className="text-[10px] text-[#71717a]">▼</span>
          </div>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Novo Chip</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddChip} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label>Clusters para este chip</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border border-[#e4e4e7] p-3 bg-white">
                    {clusters.length === 0 && <span className="text-[13px] text-[#71717a]">Cadastre clusters na página Clusters.</span>}
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
                            onChange={() => toggleClusterSelection(cluster.id)}
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

        {editingClustersChipId && (
          <Card>
            <CardHeader>
              <CardTitle>Associar Clusters ao Chip</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 rounded-md border border-[#e4e4e7] p-3 bg-white">
                  {clusters.length === 0 && (
                    <span className="text-[13px] text-[#71717a]">Nenhum cluster criado. Cadastre em /clusters.</span>
                  )}
                  {clusters.map((cluster) => {
                    const checked = editingClusterIds.includes(cluster.id);
                    return (
                      <label
                        key={cluster.id}
                        className={`text-[13px] px-2 py-1 rounded-md border cursor-pointer ${checked ? 'bg-[#dbeafe] border-[#93c5fd] text-[#1d4ed8]' : 'bg-white border-[#e4e4e7] text-[#52525b]'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEditingCluster(cluster.id)}
                          className="hidden"
                        />
                        {cluster.name}
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveChipClusters} disabled={savingClusters}>
                    {savingClusters ? 'Salvando...' : 'Salvar Clusters'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingClustersChipId(null);
                      setEditingClusterIds([]);
                    }}
                    disabled={savingClusters}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="rounded-xl overflow-clip bg-white border border-solid border-[#e4e4e7]">
          <div className="flex h-12 items-center px-4 bg-[#f4f4f5]">
            <div className="text-[13px] w-[200px] inline-block text-[#52525b] font-semibold shrink-0">Nome</div>
            <div className="text-[13px] w-[140px] inline-block text-[#52525b] font-semibold shrink-0">Telefone</div>
            <div className="text-[13px] w-[130px] inline-block text-[#52525b] font-semibold shrink-0">Instância</div>
            <div className="text-[13px] w-[170px] inline-block text-[#52525b] font-semibold shrink-0">Clusters</div>
            <div className="text-[13px] w-[110px] inline-block text-[#52525b] font-semibold shrink-0">Status</div>
            <div className="text-[13px] w-[150px] inline-block text-[#52525b] font-semibold shrink-0">Último Aquecimento</div>
            <div className="text-[13px] w-[100px] inline-block text-[#52525b] font-semibold shrink-0">Aquecimentos</div>
            <div className="text-[13px] w-[130px] inline-block text-[#52525b] font-semibold shrink-0">Ações</div>
          </div>
          
          {filteredChips.map((chip, index) => (
            <div 
              key={chip.id} 
              className={`flex h-14 items-center px-4 ${index < filteredChips.length - 1 ? 'border-b border-b-solid border-b-[#f4f4f5]' : ''}`}
            >
              <div className="text-[14px] w-[200px] inline-block text-[#18181b] shrink-0">{chip.name}</div>
              <div className="text-[14px] w-[140px] inline-block text-[#71717a] shrink-0">{chip.phone}</div>
              <div className="text-[14px] w-[130px] inline-block text-[#71717a] shrink-0 font-mono">{chip.instanceName || <span className="text-[#d4d4d8] italic">—</span>}</div>
              <div className="text-[14px] w-[170px] inline-block text-[#71717a] shrink-0 truncate">{getClusterNames(chip.clusterIds)}</div>
              <div className="flex w-[110px] items-center gap-1.5 shrink-0">
                <div className={`rounded-full w-2 h-2 ${
                  chip.status === 'connected' ? 'bg-[#22c55e]' :
                  chip.status === 'disconnected' ? 'bg-[#ef4444]' :
                  'bg-[#eab308]'
                }`} />
                <span className={`text-[13px] ${
                  chip.status === 'connected' ? 'text-[#22c55e]' :
                  chip.status === 'disconnected' ? 'text-[#ef4444]' :
                  'text-[#eab308]'
                }`}>
                  {chip.status === 'connected' ? 'Conectado' : 
                   chip.status === 'disconnected' ? 'Desconectado' : 'Aquecendo'}
                </span>
              </div>
              <div className="text-[14px] w-[150px] inline-block text-[#71717a] shrink-0">
                {formatDate(chip.lastWarmed)}
              </div>
              <div className="text-[14px] w-[100px] inline-block text-[#71717a] shrink-0">
                {chip.warmCount || 0}
              </div>
              <div className="flex w-[130px] gap-2 shrink-0 items-center">
                <Switch
                  checked={chip.enabled}
                  onCheckedChange={() => handleToggleChip(chip)}
                />
                <button
                  onClick={() => openClusterEditor(chip)}
                  className="text-[14px] border-none bg-transparent cursor-pointer"
                  title="Associar clusters"
                >
                  🧩
                </button>
                <button 
                  onClick={() => handleWarmChip(chip.id)}
                  disabled={!chip.enabled || warmingId === chip.id}
                  className="text-[14px] border-none bg-transparent cursor-pointer disabled:opacity-40"
                >
                  {warmingId === chip.id ? '⏳' : '🔥'}
                </button>
                <button 
                  onClick={() => handleDeleteChip(chip.id, chip.name)}
                  className="text-[14px] border-none bg-transparent cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {filteredChips.length === 0 && (
            <div className="flex h-24 items-center justify-center text-[#71717a]">
              Nenhum chip encontrado
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
