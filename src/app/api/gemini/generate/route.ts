import { NextRequest, NextResponse } from 'next/server';
import { requireRequestActor } from '@/lib/api-auth';
import { generateMessage, improveMessage, rewriteMessage } from '@/lib/gemini';
import { syslog } from '@/lib/system-logger';

// ─── Rate limiting (in-memory, per session token) ─────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(sessionKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionKey);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(sessionKey, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// ─── POST /api/gemini/generate ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireRequestActor(request);
  if (auth.response) return auth.response;

  // Rate limit by session token
  const sessionToken = request.cookies.get('auth')?.value ?? 'anonymous';
  if (!checkRateLimit(sessionToken)) {
    return NextResponse.json(
      { error: 'Limite de chamadas atingido. Aguarde 1 minuto.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
  }

  const { action, ...params } = body as Record<string, unknown>;

  if (!action || typeof action !== 'string') {
    return NextResponse.json({ error: 'Campo "action" é obrigatório' }, { status: 400 });
  }

  syslog({
    level: 'info',
    category: 'gemini',
    message: 'Message generation requested',
    details: { action, user: auth.actor?.userId },
  });

  // ─── Generate ────────────────────────────────────────────────────────────────

  if (action === 'generate') {
    const prompt = params.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ error: 'Campo "prompt" é obrigatório para action=generate' }, { status: 400 });
    }

    const result = await generateMessage({
      prompt: prompt.trim(),
      tone: (params.tone as 'formal' | 'informal' | 'friendly' | 'urgent') ?? 'informal',
      maxLength: typeof params.maxLength === 'number' ? params.maxLength : 500,
      candidateName: typeof params.candidateName === 'string' ? params.candidateName : undefined,
      segmentDescription: typeof params.segmentDescription === 'string' ? params.segmentDescription : undefined,
      includeVariables: params.includeVariables !== false,
    });

    if (!result) {
      return NextResponse.json({ error: 'Falha ao gerar mensagem. Verifique se o Gemini está configurado.' }, { status: 500 });
    }

    return NextResponse.json({ result });
  }

  // ─── Improve ─────────────────────────────────────────────────────────────────

  if (action === 'improve') {
    const message = params.message;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Campo "message" é obrigatório para action=improve' }, { status: 400 });
    }

    const result = await improveMessage({
      message: message.trim(),
      instruction: typeof params.instruction === 'string' ? params.instruction : undefined,
      candidateName: typeof params.candidateName === 'string' ? params.candidateName : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: 'Falha ao melhorar mensagem. Verifique se o Gemini está configurado.' }, { status: 500 });
    }

    return NextResponse.json({ result });
  }

  // ─── Rewrite ─────────────────────────────────────────────────────────────────

  if (action === 'rewrite') {
    const message = params.message;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Campo "message" é obrigatório para action=rewrite' }, { status: 400 });
    }

    const validStyles = ['shorter', 'longer', 'more_formal', 'more_casual', 'more_persuasive'];
    const style = params.style;
    if (!style || !validStyles.includes(style as string)) {
      return NextResponse.json(
        { error: `Campo "style" é obrigatório e deve ser um de: ${validStyles.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await rewriteMessage({
      message: message.trim(),
      style: style as 'shorter' | 'longer' | 'more_formal' | 'more_casual' | 'more_persuasive',
      candidateName: typeof params.candidateName === 'string' ? params.candidateName : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: 'Falha ao reescrever mensagem. Verifique se o Gemini está configurado.' }, { status: 500 });
    }

    return NextResponse.json({ result });
  }

  return NextResponse.json(
    { error: `Action "${action}" não reconhecida. Use: generate, improve, rewrite` },
    { status: 400 }
  );
}
