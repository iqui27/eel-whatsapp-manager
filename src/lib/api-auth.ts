import { NextRequest, NextResponse } from 'next/server';
import { can, type Permission, type SessionActor } from '@/lib/authorization';
import { getSessionActor } from '@/lib/db-auth';

export async function getRequestActor(request: NextRequest): Promise<SessionActor | null> {
  const token = request.cookies.get('auth')?.value;
  return getSessionActor(token);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireRequestActor(request: NextRequest) {
  const actor = await getRequestActor(request);
  if (!actor) {
    return {
      actor: null,
      response: unauthorizedResponse(),
    };
  }

  return { actor, response: null };
}

export async function requirePermission(request: NextRequest, permission: Permission, message?: string) {
  const auth = await requireRequestActor(request);
  if (auth.response) return auth;
  if (!can(auth.actor, permission)) {
    return {
      actor: auth.actor,
      response: forbiddenResponse(message ?? `Permissão insuficiente para ${permission}`),
    };
  }

  return auth;
}

