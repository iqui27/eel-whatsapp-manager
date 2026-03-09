import { NextRequest, NextResponse } from 'next/server';
import { actorLabel, PERMISSIONS, pagePermission } from '@/lib/authorization';
import { getRequestActor } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const actor = await getRequestActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    actor: {
      ...actor,
      label: actorLabel(actor),
    },
    permissions: actor.permissions,
    availablePermissions: PERMISSIONS,
    pageAccess: {
      dashboard: actor.permissions.includes(pagePermission('dashboard')!),
      campanhas: actor.permissions.includes(pagePermission('campanhas')!),
      segmentacao: actor.permissions.includes(pagePermission('segmentacao')!),
      conversas: actor.permissions.includes(pagePermission('conversas')!),
      crm: actor.permissions.includes(pagePermission('crm')!),
      compliance: actor.permissions.includes(pagePermission('compliance')!),
      relatorios: actor.permissions.includes(pagePermission('relatorios')!),
      admin: actor.permissions.includes(pagePermission('admin')!),
      chips: actor.permissions.includes(pagePermission('chips')!),
      contacts: actor.permissions.includes(pagePermission('contacts')!),
      clusters: actor.permissions.includes(pagePermission('clusters')!),
      history: actor.permissions.includes(pagePermission('history')!),
      settings: actor.permissions.includes(pagePermission('settings')!),
    },
  });
}
