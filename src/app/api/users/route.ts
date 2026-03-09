import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { loadUsers, addUser, updateUser, deleteUser } from '@/lib/db-users';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Somente administradores podem gerenciar usuários');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') ?? undefined;

  try {
    const all = await loadUsers();
    const data = role ? all.filter(u => u.role === role) : all;
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET users error:', err);
    return NextResponse.json({ error: 'Erro ao carregar usuários' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Somente administradores podem criar usuários');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.email || !body.name) {
      return NextResponse.json({ error: 'email e name são obrigatórios' }, { status: 400 });
    }
    const user = await addUser({
      email: body.email,
      name: body.name,
      role: body.role ?? 'voluntario',
      regionScope: body.regionScope ?? null,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      enabled: body.enabled ?? true,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error('POST users error:', err);
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Somente administradores podem editar usuários');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const { id, ...updates } = body;
    if (updates.email) {
      updates.email = String(updates.email).trim().toLowerCase();
    }
    const user = await updateUser(id, updates);
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error('PUT users error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Somente administradores podem remover usuários');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  try {
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE users error:', err);
    return NextResponse.json({ error: 'Erro ao remover usuário' }, { status: 500 });
  }
}
