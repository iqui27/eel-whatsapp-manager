/**
 * AI Analysis Helper
 * Phase 18 - AI Lead Analysis
 * 
 * Triggers and manages AI analysis for messages and leads.
 */

import { db } from '@/db';
import { voters, aiAnalyses, conversations, conversationMessages, type AiAnalysis, type NewAiAnalysis } from '@/db/schema';
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { analyzeMessage, profileLead, isGeminiConfigured, type MessageAnalysis, type LeadProfile } from '@/lib/gemini';

// ─── Real-Time Analysis Trigger ───────────────────────────────────────────────

/**
 * Trigger AI analysis for an inbound message
 */
export async function triggerAnalysis(
  voterPhone: string,
  messageText: string,
  options?: {
    conversationId?: string;
    voterId?: string;
    voterName?: string;
    voterTags?: string[];
  }
): Promise<{ analysis: MessageAnalysis; stored: AiAnalysis } | null> {
  if (!isGeminiConfigured()) {
    console.log('[ai-analysis] Gemini not configured, skipping analysis');
    return null;
  }

  // Get voter if not provided
  let voter = options?.voterId 
    ? await getVoterById(options.voterId)
    : await getVoterByPhone(voterPhone);

  // Run analysis
  const analysis = await analyzeMessage(messageText, {
    voterName: options?.voterName || voter?.name,
    voterTags: options?.voterTags || voter?.tags || [],
    previousMessages: await getRecentMessages(voterPhone, 3),
  });

  if (!analysis) {
    console.warn('[ai-analysis] Analysis returned null');
    return null;
  }

  // Store analysis
  const stored = await storeAnalysis({
    voterId: voter?.id || options?.voterId || undefined,
    voterPhone,
    conversationId: options?.conversationId,
    messageType: 'inbound',
    messageText,
    sentiment: analysis.sentiment,
    intent: analysis.intent,
    suggestedTags: analysis.suggestedTags,
    recommendedAction: analysis.recommendedAction,
    confidence: analysis.confidence,
    summary: analysis.summary,
  });

  // Update voter with latest analysis
  if (voter) {
    await updateVoterAnalysis(voter.id, analysis);
  }

  return { analysis, stored };
}

/**
 * Store an AI analysis in the database
 */
async function storeAnalysis(data: Omit<NewAiAnalysis, 'id' | 'createdAt'>): Promise<AiAnalysis> {
  const [analysis] = await db.insert(aiAnalyses).values(data).returning();
  return analysis;
}

/**
 * Update voter with latest AI analysis
 */
async function updateVoterAnalysis(voterId: string, analysis: MessageAnalysis): Promise<void> {
  await db.update(voters).set({
    aiSentiment: analysis.sentiment,
    aiRecommendedAction: analysis.recommendedAction,
    aiAnalysisSummary: analysis.summary,
    aiLastAnalyzed: new Date(),
    updatedAt: new Date(),
  }).where(eq(voters.id, voterId));
}

// ─── Auto-Tagging ──────────────────────────────────────────────────────────────

/**
 * Apply suggested tags to a voter
 */
export async function applyAutoTags(
  voterId: string,
  suggestedTags: string[],
  options?: { merge: boolean }
): Promise<string[]> {
  const voter = await getVoterById(voterId);
  if (!voter) return [];

  const existingTags = voter.tags || [];
  const merge = options?.merge ?? true;

  let newTags: string[];
  if (merge) {
    // Merge with existing tags (dedupe)
    newTags = [...new Set([...existingTags, ...suggestedTags])];
  } else {
    newTags = suggestedTags;
  }

  // Only update if tags changed
  if (JSON.stringify(existingTags) !== JSON.stringify(newTags)) {
    await db.update(voters).set({
      tags: newTags,
      updatedAt: new Date(),
    }).where(eq(voters.id, voterId));
    
    console.log('[ai-analysis] Applied tags to voter', voterId, ':', newTags);
  }

  return newTags;
}

// ─── Lead Profiling ────────────────────────────────────────────────────────────

/**
 * Profile a lead and update their tier
 */
export async function profileVoter(voterId: string): Promise<LeadProfile | null> {
  if (!isGeminiConfigured()) {
    return null;
  }

  const voter = await getVoterById(voterId);
  if (!voter) return null;

  // Get message history
  const messages = await getRecentMessages(voter.phone, 10);

  const profile = await profileLead({
    name: voter.name,
    tags: voter.tags || [],
    messageHistory: messages,
    engagementScore: voter.engagementScore || 0,
    contactCount: voter.contactCount || 0,
    lastContacted: voter.lastContacted?.toISOString(),
  });

  if (!profile) return null;

  // Update voter with profile
  await db.update(voters).set({
    aiTier: profile.tier,
    aiLastAnalyzed: new Date(),
    aiAnalysisSummary: profile.summary,
    aiRecommendedAction: profile.recommendedActions[0] || null,
    updatedAt: new Date(),
  }).where(eq(voters.id, voterId));

  console.log('[ai-analysis] Profiled voter', voterId, '→', profile.tier);

  return profile;
}

// ─── Query Helpers ─────────────────────────────────────────────────────────────

async function getVoterById(id: string) {
  const [voter] = await db.select().from(voters).where(eq(voters.id, id)).limit(1);
  return voter ?? null;
}

async function getVoterByPhone(phone: string) {
  const [voter] = await db.select().from(voters).where(eq(voters.phone, phone)).limit(1);
  return voter ?? null;
}

async function getRecentMessages(phone: string, limit: number): Promise<string[]> {
  // Get recent conversation messages for this phone
  const messages = await db
    .select({ content: conversationMessages.content })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversations.voterPhone, phone))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(limit);

  return messages.map(m => m.content);
}

/**
 * Get AI analysis history for a voter
 */
export async function getVoterAnalysisHistory(
  voterId: string,
  limit = 10
): Promise<AiAnalysis[]> {
  return db.select().from(aiAnalyses)
    .where(eq(aiAnalyses.voterId, voterId))
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(limit);
}

/**
 * Get voters needing profiling (not analyzed in 7+ days)
 */
export async function getVotersNeedingProfiling(limit = 100): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const result = await db.select({ id: voters.id }).from(voters)
    .where(
      and(
        isNotNull(voters.phone),
        // Either never analyzed or analyzed more than 7 days ago
        sql`(${voters.aiLastAnalyzed} IS NULL OR ${voters.aiLastAnalyzed} < ${cutoff})`
      )
    )
    .limit(limit);

  return result.map(r => r.id);
}

// Import sql for the query
import { sql } from 'drizzle-orm';