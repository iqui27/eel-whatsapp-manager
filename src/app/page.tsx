'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Chip {
  id: string;
  name: string;
  phone: string;
  groupId?: string;
  enabled: boolean;
  lastWarmed?: string;
  status: 'connected' | 'disconnected' | 'warming';
}

export default function Dashboard() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChip, setNewChip] = useState({ name: '', phone: '', groupId: '' });

  useEffect(() => {
    fetchChips();
  }, []);

  const fetchChips = async () => {
    try {
      const res = await fetch('/api/chips');
      if (res.ok) {
        const data = await res.json();
        setChips(data);
      }
    } catch (error) {
      console.error('Error fetching chips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChip),
      });
      if (res.ok) {
        setNewChip({ name: '', phone: '', groupId: '' });
        setShowAddForm(false);
        fetchChips();
      }
    } catch (error) {
      console.error('Error adding chip:', error);
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
    } catch (error) {
      console.error('Error toggling chip:', error);
    }
  };

  const handleDeleteChip = async (id: string) => {
    try {
      await fetch(`/api/chips?id=${id}`, { method: 'DELETE' });
      fetchChips();
    } catch (error) {
      console.error('Error deleting chip:', error);
    }
  };

  const handleWarmChip = async (id: string) => {
    try {
      await fetch('/api/warming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchChips();
    } catch (error) {
      console.error('Error warming chip:', error);
    }
  };

  const handleWarmAll = async () => {
    try {
      await fetch('/api/warming', { method: 'GET' });
      fetchChips();
    } catch (error) {
      console.error('Error warming all:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'warming': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">EEL - Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={handleWarmAll} variant="outline">
              🔥 Aquecer Todos
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancelar' : '+ Adicionar Chip'}
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Adicionar Novo Chip</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddChip} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Label>ID do Grupo (opcional)</Label>
                    <Input
                      value={newChip.groupId}
                      onChange={e => setNewChip({ ...newChip, groupId: e.target.value })}
                      placeholder="ID do grupo"
                    />
                  </div>
                </div>
                <Button type="submit">Salvar</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chips.map(chip => (
            <Card key={chip.id} className={!chip.enabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{chip.name}</CardTitle>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(chip.status)}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><span className="text-zinc-500">Telefone:</span> {chip.phone}</p>
                  <p><span className="text-zinc-500">Último aquecimento:</span> {formatDate(chip.lastWarmed)}</p>
                  <p><span className="text-zinc-500">Status:</span> {chip.status}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={chip.enabled}
                      onCheckedChange={() => handleToggleChip(chip)}
                    />
                    <Label className="text-sm">Ativo</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWarmChip(chip.id)}
                      disabled={!chip.enabled}
                    >
                      🔥
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteChip(chip.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {chips.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>Nenhum chip cadastrado</p>
            <p className="text-sm">Clique em "Adicionar Chip" para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
