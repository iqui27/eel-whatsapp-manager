'use client';

import type { WhatsappGroup } from '@/lib/db-groups';
import { useState } from 'react';

interface GroupCardProps {
  group: WhatsappGroup;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <span className="text-green-600 text-sm">🟢 Ativo</span>;
    case 'full':
      return <span className="text-red-600 text-sm">🔴 Cheio</span>;
    case 'archived':
      return <span className="text-gray-500 text-sm">📁 Arquivado</span>;
    default:
      return <span className="text-muted-foreground text-sm">{status}</span>;
  }
}

function getCapacityColor(percent: number) {
  if (percent >= 100) return 'bg-red-500';
  if (percent >= 90) return 'bg-yellow-500';
  if (percent >= 70) return 'bg-orange-400';
  return 'bg-green-500';
}

export function GroupCard({ group }: GroupCardProps) {
  const [copied, setCopied] = useState(false);
  const capacityPercent = Math.round((group.currentSize / group.maxSize) * 100);

  const handleCopyInvite = async () => {
    if (group.inviteUrl) {
      await navigator.clipboard.writeText(group.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSync = async () => {
    try {
      await fetch(`/api/groups/${group.id}/sync`, { method: 'POST' });
      window.location.reload();
    } catch (error) {
      console.error('Failed to sync group:', error);
    }
  };

  const handleArchive = async () => {
    try {
      await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (error) {
      console.error('Failed to archive group:', error);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-medium leading-none">{group.name}</h3>
          <div className="flex items-center gap-2">
            {getStatusBadge(group.status)}
            {group.chipInstanceName && (
              <span className="text-xs text-muted-foreground">
                via {group.chipInstanceName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{group.currentSize} / {group.maxSize} membros</span>
          <span className="text-muted-foreground">{capacityPercent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${getCapacityColor(capacityPercent)}`}
            style={{ width: `${Math.min(capacityPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Invite Link */}
      {group.inviteUrl && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={group.inviteUrl}
            readOnly
            className="flex-1 text-sm bg-muted px-2 py-1 rounded truncate"
          />
          <button
            onClick={handleCopyInvite}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {copied ? '✓' : 'Copiar'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSync}
          className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
        >
          Sincronizar
        </button>
        {group.status !== 'archived' && (
          <button
            onClick={handleArchive}
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted text-muted-foreground"
          >
            Arquivar
          </button>
        )}
      </div>
    </div>
  );
}