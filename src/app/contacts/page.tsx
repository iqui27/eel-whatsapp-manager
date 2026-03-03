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
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  clusterIds: string[];
  lastContacted?: string;
  contactCount: number;
  enabled: boolean;
}

const initialContact = {
  name: '',
  phone: '',
  clusterIds: [] as string[],
};

const initialEditContact = {
  id: '',
  name: '',
  phone: '',
  clusterIds: [] as string[],
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState(initialContact);
  const [editingContact, setEditingContact] = useState(initialEditContact);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setError(null);
    try {
      const [contactsRes, clustersRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/clusters'),
      ]);

      if (!contactsRes.ok || !clustersRes.ok) {
        if (contactsRes.status === 401 || clustersRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Falha ao carregar contatos');
      }

      const contactsData = await contactsRes.json() as Contact[];
      const clustersData = await clustersRes.json() as Cluster[];
      setContacts(contactsData);
      setClusters(clustersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  const getClusterNames = (clusterIds: string[]) => {
    const names = clusters
      .filter((cluster) => clusterIds.includes(cluster.id))
      .map((cluster) => cluster.name);
    return names;
  };

  const handleAddContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Erro ao adicionar contato');
      }

      setNewContact(initialContact);
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar contato');
    } finally {
      setSaving(false);
    }
  };

  const toggleClusterSelection = (clusterId: string) => {
    setNewContact((prev) => {
      const exists = prev.clusterIds.includes(clusterId);
      return {
        ...prev,
        clusterIds: exists
          ? prev.clusterIds.filter((id) => id !== clusterId)
          : [...prev.clusterIds, clusterId],
      };
    });
  };

  const handleToggleContact = async (contact: Contact) => {
    try {
      await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          updates: { enabled: !contact.enabled },
        }),
      });
      await fetchData();
    } catch {
      setError('Erro ao atualizar contato');
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!window.confirm(`Excluir o contato "${contact.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/contacts?id=${contact.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Falha ao excluir');
      }
      await fetchData();
    } catch {
      setError('Erro ao excluir contato');
    }
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      clusterIds: contact.clusterIds,
    });
  };

  const toggleEditingClusterSelection = (clusterId: string) => {
    setEditingContact((prev) => {
      const exists = prev.clusterIds.includes(clusterId);
      return {
        ...prev,
        clusterIds: exists
          ? prev.clusterIds.filter((id) => id !== clusterId)
          : [...prev.clusterIds, clusterId],
      };
    });
  };

  const handleUpdateContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingContact.id) {
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingContact.id,
          updates: {
            name: editingContact.name,
            phone: editingContact.phone,
            clusterIds: editingContact.clusterIds,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Erro ao atualizar contato');
      }

      setEditingContact(initialEditContact);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar contato');
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) {
      return 'Nunca';
    }

    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SidebarLayout currentPage="contacts">
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="contacts">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[24px] text-[#18181b] font-bold">Contatos</h1>
            <p className="text-[14px] text-[#71717a] mt-1">Lista de contatos para aquecimento com mensagens por cluster</p>
          </div>
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center rounded-lg py-2.5 px-4 gap-2 bg-[#3b82f6] text-white border-none text-[14px] font-medium cursor-pointer"
          >
            + Novo Contato
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
              <CardTitle>Novo Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={newContact.name}
                      onChange={(event) => setNewContact((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="João"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={newContact.phone}
                      onChange={(event) => setNewContact((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="5511999999999"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Clusters</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border border-[#e4e4e7] p-3 bg-white">
                    {clusters.length === 0 && <span className="text-[13px] text-[#71717a]">Cadastre clusters primeiro.</span>}
                    {clusters.map((cluster) => {
                      const checked = newContact.clusterIds.includes(cluster.id);
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

                <Button type="submit" disabled={saving || clusters.length === 0}>
                  {saving ? 'Salvando...' : 'Salvar Contato'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {editingContact.id && (
          <Card>
            <CardHeader>
              <CardTitle>Editar Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={editingContact.name}
                      onChange={(event) => setEditingContact((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={editingContact.phone}
                      onChange={(event) => setEditingContact((prev) => ({ ...prev, phone: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Clusters</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border border-[#e4e4e7] p-3 bg-white">
                    {clusters.map((cluster) => {
                      const checked = editingContact.clusterIds.includes(cluster.id);
                      return (
                        <label
                          key={cluster.id}
                          className={`text-[13px] px-2 py-1 rounded-md border cursor-pointer ${checked ? 'bg-[#dbeafe] border-[#93c5fd] text-[#1d4ed8]' : 'bg-white border-[#e4e4e7] text-[#52525b]'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEditingClusterSelection(cluster.id)}
                            className="hidden"
                          />
                          {cluster.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingContact(initialEditContact)} disabled={savingEdit}>
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
            <div className="text-[13px] w-[150px] text-[#52525b] font-semibold shrink-0">Telefone</div>
            <div className="text-[13px] w-[240px] text-[#52525b] font-semibold shrink-0">Clusters</div>
            <div className="text-[13px] w-[160px] text-[#52525b] font-semibold shrink-0">Último contato</div>
            <div className="text-[13px] w-[110px] text-[#52525b] font-semibold shrink-0">Envios</div>
            <div className="text-[13px] w-[130px] text-[#52525b] font-semibold shrink-0">Ações</div>
          </div>

          {contacts.map((contact, index) => (
            <div
              key={contact.id}
              className={`flex h-14 items-center px-4 ${index < contacts.length - 1 ? 'border-b border-b-solid border-b-[#f4f4f5]' : ''}`}
            >
              <div className="text-[14px] w-[180px] text-[#18181b] shrink-0">{contact.name}</div>
              <div className="text-[14px] w-[150px] text-[#71717a] shrink-0">{contact.phone}</div>
              <div className="text-[14px] w-[240px] text-[#71717a] shrink-0 truncate">{getClusterNames(contact.clusterIds).join(', ') || 'Sem cluster'}</div>
              <div className="text-[14px] w-[160px] text-[#71717a] shrink-0">{formatDate(contact.lastContacted)}</div>
              <div className="text-[14px] w-[110px] text-[#71717a] shrink-0">{contact.contactCount ?? 0}</div>
              <div className="flex w-[130px] gap-2 items-center shrink-0">
                <Switch checked={contact.enabled} onCheckedChange={() => void handleToggleContact(contact)} />
                <button
                  onClick={() => handleOpenEdit(contact)}
                  className="text-[14px] border-none bg-transparent cursor-pointer"
                  title="Editar contato"
                >
                  ✏️
                </button>
                <button
                  onClick={() => void handleDeleteContact(contact)}
                  className="text-[14px] border-none bg-transparent cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {contacts.length === 0 && (
            <div className="flex h-24 items-center justify-center text-[#71717a]">
              Nenhum contato cadastrado
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
