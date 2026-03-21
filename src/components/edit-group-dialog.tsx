'use client';

import { useState } from 'react';
import type { WhatsappGroup } from '@/lib/db-groups';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SegmentInfo {
  id: string;
  name: string;
  segmentTag: string | null;
}

interface EditGroupDialogProps {
  group: WhatsappGroup;
  segments?: SegmentInfo[];
}

export function EditGroupDialog({ group, segments = [] }: EditGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [segmentTag, setSegmentTag] = useState(group.segmentTag ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          segmentTag: segmentTag || null,
        }),
      });

      if (res.ok) {
        setOpen(false);
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar grupo');
      }
    } catch {
      alert('Erro ao salvar grupo');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setName(group.name);
    setDescription(group.description ?? '');
    setSegmentTag(group.segmentTag ?? '');
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
        onClick={handleOpen}
      >
        <Pencil className="h-3 w-3" />
        Editar
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Editar Grupo</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Nome *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-description" className="text-sm font-medium">
                  Descrição
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-segment" className="text-sm font-medium">
                  Segmento
                </label>
                <select
                  id="edit-segment"
                  value={segmentTag}
                  onChange={(e) => setSegmentTag(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Nenhum</option>
                  {segments.filter(s => s.segmentTag).map((s) => (
                    <option key={s.id} value={s.segmentTag!}>
                      {s.name} ({s.segmentTag})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
