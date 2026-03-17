/**
 * AI Insights Helper
 * Phase 18 - AI Lead Analysis
 * 
 * Helper functions for AI insights and lead scoring.
 */

import { db } from '@/db';
import { voters, aiAnalyses } from '@/db/schema';
import { eq, desc, and, isNotNull, sql, count } from 'drizzle-orm';

// ─── Voter AI Insights ─────────────────────────────────────────────────────────

export interface VoterAIInsights {
  voterId: string;
  tier: 'hot' | 'warm' | 'cold' | 'dead' | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  lastAnalyzed: Date | null;
  summary: string | null;
  recommendedAction: string | null;
  analysisHistory: Array<{
    id: string;
    sentiment: string | null;
    intent: string | null;
    summary: string | null;
    createdAt: Date;
  }>;
}

/**
 * Get AI insights for a voter
 */
export async function getVoterAIInsights(voterId: string): Promise<VoterAIInsights | null> {
  const [voter] = await db.select().from(voters).where(eq(voters.id, voterId)).limit(1);
  
  if (!voter) return null;

  const history = await db.select({
    id: aiAnalyses.id,
    sentiment: aiAnalyses.sentiment,
    intent: aiAnalyses.intent,
    summary: aiAnalyses.summary,
    createdAt: aiAnalyses.createdAt,
  })
    .from(aiAnalyses)
    .where(eq(aiAnalyses.voterId, voterId))
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(10);

  return {
    voterId,
    tier: voter.aiTier,
    sentiment: voter.aiSentiment,
    lastAnalyzed: voter.aiLastAnalyzed,
    summary: voter.aiAnalysisSummary,
    recommendedAction: voter.aiRecommendedAction,
    analysisHistory: history.map(h => ({
      id: h.id,
      sentiment: h.sentiment,
      intent: h.intent,
      summary: h.summary,
      createdAt: h.createdAt ?? new Date(),
    })),
  };
}

// ─── Lead Stats ────────────────────────────────────────────────────────────────

export interface AILeadStats {
  total: number;
  analyzed: number;
  notAnalyzed: number;
  tiers: {
    hot: number;
    warm: number;
    cold: number;
    dead: number;
  };
  sentiments: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

/**
 * Get aggregate AI lead statistics
 */
export async function getAILeadStats(): Promise<AILeadStats> {
  // Get total voters
  const [totalResult] = await db.select({ count: count() }).from(voters);
  const total = totalResult?.count || 0;

  // Get tier counts
  const tierCounts = await db
    .select({
      tier: voters.aiTier,
      count: count(),
    })
    .from(voters)
    .where(isNotNull(voters.aiTier))
    .groupBy(voters.aiTier);

  const tiers = { hot: 0, warm: 0, cold: 0, dead: 0 };
  for (const row of tierCounts) {
    if (row.tier && row.tier in tiers) {
      tiers[row.tier as keyof typeof tiers] = row.count;
    }
  }

  // Get sentiment counts
  const sentimentCounts = await db
    .select({
      sentiment: voters.aiSentiment,
      count: count(),
    })
    .from(voters)
    .where(isNotNull(voters.aiSentiment))
    .groupBy(voters.aiSentiment);

  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  for (const row of sentimentCounts) {
    if (row.sentiment && row.sentiment in sentiments) {
      sentiments[row.sentiment as keyof typeof sentiments] = row.count;
    }
  }

  const analyzed = tiers.hot + tiers.warm + tiers.cold + tiers.dead;

  return {
    total,
    analyzed,
    notAnalyzed: total - analyzed,
    tiers,
    sentiments,
  };
}

// ─── Recommended Actions ───────────────────────────────────────────────────────

export interface VoterWithAction {
  id: string;
  name: string;
  phone: string;
  tags: string[] | null;
  aiTier: string | null;
  aiRecommendedAction: string | null;
  aiLastAnalyzed: Date | null;
}

/**
 * Get voters needing specific actions
 */
export async function getVotersByRecommendedAction(
  action: string,
  limit = 20
): Promise<VoterWithAction[]> {
  return db.select({
    id: voters.id,
    name: voters.name,
    phone: voters.phone,
    tags: voters.tags,
    aiTier: voters.aiTier,
    aiRecommendedAction: voters.aiRecommendedAction,
    aiLastAnalyzed: voters.aiLastAnalyzed,
  })
    .from(voters)
    .where(eq(voters.aiRecommendedAction, action))
    .orderBy(desc(voters.aiLastAnalyzed))
    .limit(limit);
}

/**
 * Get all voters with recommended actions
 */
export async function getVotersWithActions(limit = 50): Promise<VoterWithAction[]> {
  return db.select({
    id: voters.id,
    name: voters.name,
    phone: voters.phone,
    tags: voters.tags,
    aiTier: voters.aiTier,
    aiRecommendedAction: voters.aiRecommendedAction,
    aiLastAnalyzed: voters.aiLastAnalyzed,
  })
    .from(voters)
    .where(isNotNull(voters.aiRecommendedAction))
    .orderBy(desc(voters.aiLastAnalyzed))
    .limit(limit);
}

// ─── Invalidate Analysis ───────────────────────────────────────────────────────

/**
 * Mark a voter for re-analysis by clearing last analyzed timestamp
 */
export async function invalidateAnalysis(voterId: string): Promise<void> {
  await db.update(voters)
    .set({
      aiLastAnalyzed: null,
      updatedAt: new Date(),
    })
    .where(eq(voters.id, voterId));
}

/**
 * Get voters needing analysis (not analyzed in X days)
 */
export async function getVotersNeedingAnalysis(days = 7, limit = 100): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await db.select({ id: voters.id })
    .from(voters)
    .where(
      and(
        isNotNull(voters.phone),
        sql`(${voters.aiLastAnalyzed} IS NULL OR ${voters.aiLastAnalyzed} < ${cutoff})`
      )
    )
    .limit(limit);

  return result.map(r => r.id);
}