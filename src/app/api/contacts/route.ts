import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { addContact, deleteContact, loadContacts, updateContact } from '@/lib/db-contacts';
import { validateSession } from '@/lib/db-auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return loadConfig();
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contacts = await loadContacts();
  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      name?: string;
      phone?: string;
      clusterIds?: string[];
      enabled?: boolean;
    };

    const name = body.name?.trim();
    const phone = body.phone?.trim();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    const contact = await addContact({
      name,
      phone,
      contactCount: 0,
      enabled: body.enabled ?? true,
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Add contact error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar contato' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      id?: string;
      updates?: {
        name?: string;
        phone?: string;
        clusterIds?: string[];
        enabled?: boolean;
        lastContacted?: string;
        contactCount?: number;
      };
    };

    if (!body.id || !body.updates) {
      return NextResponse.json({ error: 'ID e updates são obrigatórios' }, { status: 400 });
    }

    const { lastContacted, ...rest } = body.updates;
    await updateContact(body.id, {
      ...rest,
      ...(lastContacted ? { lastContacted: new Date(lastContacted) } : {}),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar contato' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json({ error: 'Erro ao deletar contato' }, { status: 500 });
  }
}
