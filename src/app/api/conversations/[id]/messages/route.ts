import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { getMessages, addMessage } from '@/lib/db-conversations';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  return await validateSession(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const messages = await getMessages(id);
    return NextResponse.json(messages);
  } catch (err) {
    console.error('[GET messages]', err);
    return NextResponse.json({ error: 'Erro ao carregar mensagens' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.sender || !body.content) {
      return NextResponse.json({ error: 'sender e content são obrigatórios' }, { status: 400 });
    }
    const message = await addMessage(id, body.sender, body.content);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('[POST message]', err);
    return NextResponse.json({ error: 'Erro ao adicionar mensagem' }, { status: 500 });
  }
}
