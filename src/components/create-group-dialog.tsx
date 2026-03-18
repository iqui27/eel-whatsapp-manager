'use client';

import { useState, useEffect } from 'react';
import type { Chip } from '@/db/schema';

interface SegmentOption {
  id: string;
  name: string;
  segmentTag: string | null;
}

interface CreateGroupDialogProps {
  chips: Chip[];
  segments: SegmentOption[];
}

export function CreateGroupDialog({ chips, segments }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chipId, setChipId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [participants, setParticipants] = useState('');

  const connectedChips = chips.filter(c => c.status === 'connected' || c.healthStatus === 'healthy');

  // Auto-select chip when segment is chosen
  useEffect(() => {
    if (segmentId) {
      const segment = segments.find(s => s.id === segmentId);
      if (segment) {
        // Find chip that has this segment assigned
        const chipWithSegment = chips.find(c => 
          c.assignedSegments?.includes(segment.segmentTag || '')
        );
        if (chipWithSegment) {
          setChipId(chipWithSegment.id);
        }
      }
    }
  }, [segmentId, segments, chips]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !chipId) {
      return;
    }

    setLoading(true);
    try {
      const segment = segments.find(s => s.id === segmentId);
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          chipId,
          segmentTag: segment?.segmentTag || undefined,
          participants: participants ? participants.split(',').map(p => p.trim()) : undefined,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setName('');
        setDescription('');
        setChipId('');
        setSegmentId('');
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
          <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
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
                  Descricao
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Descricao opcional do grupo"
                  rows={2}
                />
              </div>

              {/* Segment Selection */}
              <div className="space-y-1">
                <label htmlFor="segment" className="text-sm font-medium">
                  Segmento
                </label>
                <select
                  id="segment"
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Selecione um segmento (opcional)</option>
                  {segments.filter(s => s.segmentTag).map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name} ({segment.segmentTag})
                    </option>
                  ))}
                </select>
                {segments.filter(s => s.segmentTag).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum segmento com tag. Crie segmentos com tags para associar grupos.
                  </p>
                )}
              </div>

              {/* Chip Selection */}
              <div className="space-y-1">
                <label htmlFor="chip" className="text-sm font-medium">
                  Chip/Instancia *
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
                  placeholder="Numeros separados por virgula (ex: 5511999999999)"
                />
                <p className="text-xs text-muted-foreground">
                  Numeros no formato E.164 (codigo pais + DDD + numero)
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