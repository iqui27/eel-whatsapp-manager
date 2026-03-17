'use client';

import { Copy, Plus } from 'lucide-react';

interface GroupData {
  id: string;
  name: string;
  currentSize: number;
  maxSize: number;
  status: string;
  inviteUrl: string | null;
  chipInstanceName: string | null;
}

interface GroupCapacityGridProps {
  groups: GroupData[];
  onCopyInvite?: (groupId: string) => void;
  onCreateOverflow?: (groupId: string) => void;
  loading?: boolean;
}

function getStatusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case 'active':
      return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
    case 'full':
      return { label: 'Cheio', color: 'bg-red-100 text-red-700' };
    case 'archived':
      return { label: 'Arquivado', color: 'bg-gray-100 text-gray-500' };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-500' };
  }
}

export function GroupCapacityGrid({ groups, onCopyInvite, onCreateOverflow, loading }: GroupCapacityGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-3 animate-pulse h-24 bg-muted" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum grupo configurado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {groups.map((group) => {
        const capacity = (group.currentSize / group.maxSize) * 100;
        const status = getStatusBadge(group.status);
        const nearCapacity = capacity >= 90;
        
        return (
          <div
            key={group.id}
            className="rounded-lg border bg-card p-3 space-y-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate max-w-[120px]">
                {group.name}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${status.color}`}>
                {status.label}
              </span>
            </div>
            
            {/* Capacity bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{group.currentSize}/{group.maxSize}</span>
                <span className={nearCapacity ? 'text-red-600' : ''}>
                  {Math.round(capacity)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    capacity >= 100 ? 'bg-red-500' :
                    capacity >= 90 ? 'bg-orange-500' :
                    capacity >= 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(capacity, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between text-xs">
              {group.chipInstanceName && (
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {group.chipInstanceName}
                </span>
              )}
              <div className="flex gap-1">
                {group.inviteUrl && onCopyInvite && (
                  <button
                    onClick={() => onCopyInvite(group.id)}
                    className="p-1 hover:bg-muted rounded"
                    title="Copiar link"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
                {nearCapacity && onCreateOverflow && (
                  <button
                    onClick={() => onCreateOverflow(group.id)}
                    className="p-1 hover:bg-muted rounded text-blue-600"
                    title="Criar grupo overflow"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}