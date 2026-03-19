/**
 * Compliance data access — Drizzle / Supabase
 * Consent tracking and audit operations for LGPD compliance.
 */
import { db } from '@/db';
import {
  consentLogs, voters,
  type ConsentLog, type NewConsentLog,
} from '@/db/schema';
import { eq, desc, count } from 'drizzle-orm';

export type { ConsentLog, NewConsentLog };

// ─── Opt-in/out keyword detection ─────────────────────────────────────────────

export const OPT_IN_KEYWORDS = ['sim', 'aceito', 'concordo', 'quero', 'aceitar', 'ok'];
export const OPT_OUT_KEYWORDS = ['sair', 'parar', 'cancelar', 'remover', 'não quero', 'nao quero', 'pare'];

export const OPT_IN_CONFIRMATION = '✅ Obrigado! Seu consentimento foi registrado. Você receberá nossas mensagens. Para cancelar a qualquer momento, responda SAIR.';
export const OPT_OUT_CONFIRMATION = '🚫 Entendido! Você foi removido da nossa lista de mensagens. Não receberá mais comunicações. Para voltar, responda SIM.';

/**
 * Check if a message text matches opt-in or opt-out keywords.
 * Returns 'opt_in', 'revoke', or null.
 */
export function detectConsentKeyword(text: string): 'opt_in' | 'revoke' | null {
  const normalized = text.trim().toLowerCase();

  // Check exact match first (single word messages like "SIM", "SAIR")
  if (OPT_IN_KEYWORDS.includes(normalized)) return 'opt_in';
  if (OPT_OUT_KEYWORDS.includes(normalized)) return 'revoke';

  // Check if message starts with a keyword (e.g., "Sim, quero participar")
  for (const kw of OPT_IN_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized.startsWith(kw + ',') || normalized.startsWith(kw + '.')) {
      return 'opt_in';
    }
  }
  for (const kw of OPT_OUT_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized.startsWith(kw + ',') || normalized.startsWith(kw + '.')) {
      return 'revoke';
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Map consent action to the resulting voter opt_in_status */
const actionToStatus: Record<NonNullable<ConsentLog['action']>, NonNullable<import('@/db/schema').Voter['optInStatus']>> = {
  opt_in: 'active',
  renew: 'active',
  opt_out: 'expired',
  revoke: 'revoked',
};

export async function logConsent(
  voterId: string,
  action: NonNullable<ConsentLog['action']>,
  channel = 'whatsapp',
  metadata?: string,
): Promise<ConsentLog> {
  const [log] = await db
    .insert(consentLogs)
    .values({ voterId, action, channel, metadata })
    .returning();

  // Update voter opt_in_status based on the action
  await db
    .update(voters)
    .set({
      optInStatus: actionToStatus[action],
      optInDate: action === 'opt_in' || action === 'renew' ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(voters.id, voterId));

  return log;
}

export async function getConsentHistory(voterId: string): Promise<ConsentLog[]> {
  return db
    .select()
    .from(consentLogs)
    .where(eq(consentLogs.voterId, voterId))
    .orderBy(desc(consentLogs.createdAt));
}

export type ConsentLogWithVoter = ConsentLog & { voterName: string | null; voterPhone: string | null };

export async function getAllConsentLogs(action?: string): Promise<ConsentLogWithVoter[]> {
  const rows = await db
    .select({
      id: consentLogs.id,
      voterId: consentLogs.voterId,
      action: consentLogs.action,
      channel: consentLogs.channel,
      ipAddress: consentLogs.ipAddress,
      metadata: consentLogs.metadata,
      createdAt: consentLogs.createdAt,
      voterName: voters.name,
      voterPhone: voters.phone,
    })
    .from(consentLogs)
    .leftJoin(voters, eq(consentLogs.voterId, voters.id))
    .orderBy(desc(consentLogs.createdAt));

  if (action) {
    return rows.filter(r => r.action === action);
  }
  return rows;
}

export async function getConsentStats(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      status: voters.optInStatus,
      total: count(),
    })
    .from(voters)
    .groupBy(voters.optInStatus);

  return Object.fromEntries(
    rows.map((r) => [r.status ?? 'unknown', r.total]),
  );
}
