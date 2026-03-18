import Link from 'next/link';
import { listGroups } from '@/lib/db-groups';
import { GroupCard } from '@/components/group-card';
import { CreateGroupDialog } from '@/components/create-group-dialog';
import { loadChips } from '@/lib/db-chips';
import { loadSegments } from '@/lib/db-segments';
import { Suspense } from 'react';

interface GroupsPageProps {
  searchParams: Promise<{
    status?: 'active' | 'full' | 'archived';
    campaignId?: string;
  }>;
}

async function GroupsList({ status, campaignId }: { status?: 'active' | 'full' | 'archived'; campaignId?: string }) {
  const groups = await listGroups({ status, campaignId });

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum grupo encontrado.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Crie um novo grupo ou sincronize grupos existentes do WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const params = await searchParams;
  const status = params.status;
  const campaignId = params.campaignId;
  const chips = await loadChips();
  const segmentsData = await loadSegments();
  
  // Map segments for the dialog
  const segments = segmentsData.map(s => ({
    id: s.id,
    name: s.name,
    segmentTag: s.segmentTag,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grupos WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie grupos para campanhas e convites
          </p>
        </div>
        <CreateGroupDialog chips={chips} segments={segments} />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Link
          href="/grupos"
          className={`px-3 py-1.5 rounded-md text-sm ${
            !status ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Todos
        </Link>
        <Link
          href="/grupos?status=active"
          className={`px-3 py-1.5 rounded-md text-sm ${
            status === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Ativos
        </Link>
        <Link
          href="/grupos?status=full"
          className={`px-3 py-1.5 rounded-md text-sm ${
            status === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Cheios
        </Link>
        <Link
          href="/grupos?status=archived"
          className={`px-3 py-1.5 rounded-md text-sm ${
            status === 'archived' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Arquivados
        </Link>
      </div>

      {/* Groups Grid */}
      <Suspense fallback={<div className="text-center py-12">Carregando...</div>}>
        <GroupsList status={status} campaignId={campaignId} />
      </Suspense>
    </div>
  );
}