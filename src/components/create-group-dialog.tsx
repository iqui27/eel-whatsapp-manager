'use client';

import { useState } from 'react';
import type { Chip } from '@/db/schema';

interface CreateGroupDialogProps {
  chips: Chip[];
}

export function CreateGroupDialog({ chips }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chipId, setChipId] = useState('');
  const [participants, setParticipants] = useState('');

  const connectedChips = chips.filter(c => c.status === 'connected' || c.healthStatus === 'healthy');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !chipId) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          chipId,
          participants: participants ? participants.split(',').map(p => p.trim()) : undefined,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setName('');
        setDescription('');
        setChipId('');
        setParticipants('');
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao criar grupo');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Erro ao criar grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Novo Grupo
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Criar Grupo WhatsApp</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Group Name */}
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome do Grupo *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Ex: Apoiadores Zona 101"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="description" className="text-sm font-medium">
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Descrição opcional do grupo"
                  rows={2}
                />
              </div>

              {/* Chip Selection */}
              <div className="space-y-1">
                <label htmlFor="chip" className="text-sm font-medium">
                  Chip/Instância *
                </label>
                <select
                  id="chip"
                  value={chipId}
                  onChange={(e) => setChipId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Selecione um chip</option>
                  {connectedChips.map((chip) => (
                    <option key={chip.id} value={chip.id}>
                      {chip.name} ({chip.phone})
                    </option>
                  ))}
                </select>
                {connectedChips.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum chip conectado. Conecte um chip antes de criar grupos.
                  </p>
                )}
              </div>

              {/* Initial Participants */}
              <div className="space-y-1">
                <label htmlFor="participants" className="text-sm font-medium">
                  Participantes Iniciais
                </label>
                <input
                  id="participants"
                  type="text"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Números separados por vírgula (ex: 5511999999999)"
                />
                <p className="text-xs text-muted-foreground">
                  Números no formato E.164 (código país + DDD + número)
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name || !chipId}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}