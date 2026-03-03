'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SidebarLayout from '@/components/SidebarLayout';

interface Cluster {
  id: string;
  name: string;
  messages: string[];
  maxMessagesPerDay: number;
  priority: number;
  windowStart?: string;
  windowEnd?: string;
  enabled: boolean;
}

interface Contact {
  id: string;
  clusterIds: string[];
}

const initialCluster = {
  name: '',
  messagesText: '',
  maxMessagesPerDay: 10,
  priority: 1,
  windowStart: '08:00',
  windowEnd: '22:00',
};

const initialEditCluster = {
  id: '',
  name: '',
  messagesText: '',
  maxMessagesPerDay: 10,
  priority: 1,
  windowStart: '08:00',
  windowEnd: '22:00',
};

export default function ClustersPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCluster, setNewCluster] = useState(initialCluster);
  const [saving, setSaving] = useState(false);
  const [editingCluster, setEditingCluster] = useState(initialEditCluster);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setError(null);
    try {
      const [clustersRes, contactsRes] = await Promise.all([
        fetch('/api/clusters'),
        fetch('/api/contacts'),
      ]);

      if (!clustersRes.ok || !contactsRes.ok) {
        if (clustersRes.status === 401 || contactsRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Falha ao carregar clusters');
      }

      const clustersData = await clustersRes.json() as Cluster[];
      const contactsData = await contactsRes.json() as Contact[];
      setClusters(clustersData);
      setContacts(contactsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clusters');
    } finally {
      setLoading(false);
    }
  };

  const getContactsCount = (clusterId: string) => contacts.filter((contact) => contact.clusterIds.includes(clusterId)).length;

  const handleAddCluster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const messages = newCluster.messagesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const response = await fetch('/api/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCluster.name,
          messages,
          maxMessagesPerDay: Number(newCluster.maxMessagesPerDay),
          priority: Number(newCluster.priority),
          windowStart: newCluster.windowStart,
          windowEnd: newCluster.windowEnd,
          enabled: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Erro ao criar cluster');
      }

      setNewCluster(initialCluster);
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cluster');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cluster: Cluster) => {
    try {
      await fetch('/api/clusters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cluster.id,
          updates: { enabled: !cluster.enabled },
        }),
      });
      await fetchData();
    } catch {
      setError('Erro ao atualizar cluster');
    }
  };

  const handleDelete = async (cluster: Cluster) => {
    if (!window.confirm(`Excluir o cluster "${cluster.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clusters?id=${cluster.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Falha ao excluir');
      }
      await fetchData();
    } catch {
      setError('Erro ao excluir cluster');
    }
  };

  const handleOpenEdit = (cluster: Cluster) => {
    setEditingCluster({
      id: cluster.id,
      name: cluster.name,
      messagesText: cluster.messages.join('\n'),
      maxMessagesPerDay: cluster.maxMessagesPerDay,
      priority: cluster.priority,
      windowStart: cluster.windowStart ?? '08:00',
      windowEnd: cluster.windowEnd ?? '22:00',
    });
  };

  const handleUpdateCluster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCluster.id) {
      return;
    }

    setSavingEdit(true);
    const messages = editingCluster.messagesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const response = await fetch('/api/clusters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCluster.id,
          updates: {
            name: editingCluster.name,
            messages,
            maxMessagesPerDay: Number(editingCluster.maxMessagesPerDay),
            priority: Number(editingCluster.priority),
            windowStart: editingCluster.windowStart,
            windowEnd: editingCluster.windowEnd,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Erro ao atualizar cluster');
      }

      setEditingCluster(initialEditCluster);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cluster');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout currentPage="clusters">
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="clusters">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[24px] text-[#18181b] font-bold">Clusters</h1>
            <p className="text-[14px] text-[#71717a] mt-1">Agrupe contatos e personalize mensagens de aquecimento</p>
          </div>
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center rounded-lg py-2.5 px-4 gap-2 bg-[#3b82f6] text-white border-none text-[14px] font-medium cursor-pointer"
          >
            + Novo Cluster
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3">
            <span className="text-[#ef4444] text-[14px]">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-[#ef4444] text-[18px] border-none bg-transparent cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Novo Cluster</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCluster} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cluster</Label>
                    <Input
                      value={newCluster.name}
                      onChange={(event) => setNewCluster((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Clientes"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. mensagens por dia</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newCluster.maxMessagesPerDay}
                      onChange={(event) => setNewCluster((prev) => ({ ...prev, maxMessagesPerDay: Number(event.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade (1 = primeiro)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newCluster.priority}
                      onChange={(event) => setNewCluster((prev) => ({ ...prev, priority: Number(event.target.value) }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Janela início</Label>
                      <Input
                        type="time"
                        value={newCluster.windowStart}
                        onChange={(event) => setNewCluster((prev) => ({ ...prev, windowStart: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Janela fim</Label>
                      <Input
                        type="time"
                        value={newCluster.windowEnd}
                        onChange={(event) => setNewCluster((prev) => ({ ...prev, windowEnd: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagens (1 por linha, com Spintax)</Label>
                  <textarea
                    value={newCluster.messagesText}
                    onChange={(event) => setNewCluster((prev) => ({ ...prev, messagesText: event.target.value }))}
                    placeholder="Olá {tudo bem|como vai}?"
                    rows={6}
                    className="w-full rounded-md border border-[#e4e4e7] bg-white p-3 text-[14px] outline-none"
                    required
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Cluster'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {editingCluster.id && (
          <Card>
            <CardHeader>
              <CardTitle>Editar Cluster</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCluster} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cluster</Label>
                    <Input
                      value={editingCluster.name}
                      onChange={(event) => setEditingCluster((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. mensagens por dia</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingCluster.maxMessagesPerDay}
                      onChange={(event) => setEditingCluster((prev) => ({ ...prev, maxMessagesPerDay: Number(event.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade (1 = primeiro)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingCluster.priority}
                      onChange={(event) => setEditingCluster((prev) => ({ ...prev, priority: Number(event.target.value) }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Janela início</Label>
                      <Input
                        type="time"
                        value={editingCluster.windowStart}
                        onChange={(event) => setEditingCluster((prev) => ({ ...prev, windowStart: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Janela fim</Label>
                      <Input
                        type="time"
                        value={editingCluster.windowEnd}
                        onChange={(event) => setEditingCluster((prev) => ({ ...prev, windowEnd: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagens (1 por linha, com Spintax)</Label>
                  <textarea
                    value={editingCluster.messagesText}
                    onChange={(event) => setEditingCluster((prev) => ({ ...prev, messagesText: event.target.value }))}
                    rows={6}
                    className="w-full rounded-md border border-[#e4e4e7] bg-white p-3 text-[14px] outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingCluster(initialEditCluster)} disabled={savingEdit}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="rounded-xl overflow-clip bg-white border border-solid border-[#e4e4e7]">
          <div className="flex h-12 items-center px-4 bg-[#f4f4f5]">
            <div className="text-[13px] w-[180px] text-[#52525b] font-semibold shrink-0">Nome</div>
            <div className="text-[13px] w-[120px] text-[#52525b] font-semibold shrink-0">Contatos</div>
            <div className="text-[13px] w-[220px] text-[#52525b] font-semibold shrink-0">Mensagens</div>
            <div className="text-[13px] w-[130px] text-[#52525b] font-semibold shrink-0">Máx/Dia</div>
            <div className="text-[13px] w-[110px] text-[#52525b] font-semibold shrink-0">Prioridade</div>
            <div className="text-[13px] w-[140px] text-[#52525b] font-semibold shrink-0">Janela</div>
            <div className="text-[13px] w-[130px] text-[#52525b] font-semibold shrink-0">Ações</div>
          </div>

          {clusters.map((cluster, index) => (
            <div
              key={cluster.id}
              className={`flex h-14 items-center px-4 ${index < clusters.length - 1 ? 'border-b border-b-solid border-b-[#f4f4f5]' : ''}`}
            >
              <div className="text-[14px] w-[180px] text-[#18181b] shrink-0">{cluster.name}</div>
              <div className="text-[14px] w-[120px] text-[#71717a] shrink-0">{getContactsCount(cluster.id)}</div>
              <div className="text-[14px] w-[220px] text-[#71717a] truncate shrink-0">{cluster.messages[0] ?? '—'}</div>
              <div className="text-[14px] w-[130px] text-[#71717a] shrink-0">{cluster.maxMessagesPerDay}</div>
              <div className="text-[14px] w-[110px] text-[#71717a] shrink-0">{cluster.priority}</div>
              <div className="text-[14px] w-[140px] text-[#71717a] shrink-0">{cluster.windowStart ?? '--:--'} - {cluster.windowEnd ?? '--:--'}</div>
              <div className="flex w-[130px] gap-2 items-center shrink-0">
                <Switch checked={cluster.enabled} onCheckedChange={() => void handleToggle(cluster)} />
                <button
                  onClick={() => handleOpenEdit(cluster)}
                  className="text-[14px] border-none bg-transparent cursor-pointer"
                  title="Editar cluster"
                >
                  ✏️
                </button>
                <button
                  onClick={() => void handleDelete(cluster)}
                  className="text-[14px] border-none bg-transparent cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {clusters.length === 0 && (
            <div className="flex h-24 items-center justify-center text-[#71717a]">
              Nenhum cluster cadastrado
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
