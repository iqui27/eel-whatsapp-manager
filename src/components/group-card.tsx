'use client';

import type { WhatsappGroup } from '@/lib/db-groups';
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy, Check, RefreshCw, Archive, Tag, Layers, Users, ChevronRight, Pencil } from 'lucide-react';
import { EditGroupDialog } from '@/components/edit-group-dialog';

interface SegmentInfo {
  id: string;
  name: string;
  segmentTag: string | null;
}

interface GroupCardProps {
  group: WhatsappGroup;
  segments?: SegmentInfo[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active:   { label: 'Ativo',      className: 'bg-green-500/10 text-green-700 border-green-200' },
    full:     { label: 'Cheio',      className: 'bg-red-500/10 text-red-700 border-red-200' },
    archived: { label: 'Arquivado',  className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', className)}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'active' ? 'bg-green-500' : status === 'full' ? 'bg-red-500' : 'bg-muted-foreground',
      )} />
      {label}
    </span>
  );
}

function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(Math.round((current / max) * 100), 100);
  const color =
    pct >= 100 ? 'bg-red-500' :
    pct >= 90  ? 'bg-amber-500' :
    pct >= 70  ? 'bg-orange-400' :
                 'bg-green-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {current.toLocaleString('pt-BR')} / {max.toLocaleString('pt-BR')} membros
        </span>
        <span className={cn('font-medium tabular-nums',
          pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-muted-foreground'
        )}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function GroupCard({ group, segments = [] }: GroupCardProps) {
  const segmentName = segments.find(s => s.segmentTag === group.segmentTag)?.name;
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleCopyInvite = async () => {
    if (!group.inviteUrl) return;
    await navigator.clipboard.writeText(group.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/groups/${group.id}/sync`, { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Failed to sync group:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      console.error('Failed to archive group:', err);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
            {group.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
            )}
          </div>
          <StatusBadge status={group.status} />
        </div>

        {/* Chip + Segment row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {group.chipInstanceName && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
              {group.chipInstanceName}
            </span>
          )}
          {group.segmentTag && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 shrink-0" />
              <span className="text-xs">
                {segmentName ?? <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{group.segmentTag}</code>}
              </span>
            </span>
          )}
        </div>

        {/* Tags */}
        {group.admins && group.admins.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
            {group.admins.slice(0, 3).map((a) => (
              <Badge key={a} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                {a}
              </Badge>
            ))}
            {group.admins.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{group.admins.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Capacity */}
      <div className="px-4 pb-3">
        <CapacityBar current={group.currentSize} max={group.maxSize} />
      </div>

      {/* Invite URL */}
      {group.inviteUrl && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
            <span className="flex-1 text-xs text-muted-foreground font-mono truncate">
              {group.inviteUrl.replace('https://', '')}
            </span>
            <button
              onClick={handleCopyInvite}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Copiar link"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-4 pb-4 pt-1 border-t border-border/50 mt-auto">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={cn('h-3 w-3', syncing && 'animate-spin')} />
          Sincronizar
        </Button>
        {group.status !== 'archived' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleArchive}
            disabled={archiving}
          >
            <Archive className="h-3 w-3" />
            Arquivar
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <EditGroupDialog group={group} segments={segments} />
          <Link href={`/grupos/${group.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              Ver detalhes
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
