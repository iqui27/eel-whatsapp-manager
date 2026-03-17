import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isGeminiConfigured } from '@/lib/gemini';
import { profileVoter, getVoterAnalysisHistory } from '@/lib/ai-analysis';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/voters/[id]/ai
 * Get AI analysis for a voter
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [voter] = await db.select().from(voters).where(eq(voters.id, id)).limit(1);

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Get analysis history
    const history = await getVoterAnalysisHistory(id, 10);

    return NextResponse.json({
      voter: {
        id: voter.id,
        name: voter.name,
        phone: voter.phone,
        tags: voter.tags,
        aiTier: voter.aiTier,
        aiSentiment: voter.aiSentiment,
        aiLastAnalyzed: voter.aiLastAnalyzed,
        aiAnalysisSummary: voter.aiAnalysisSummary,
        aiRecommendedAction: voter.aiRecommendedAction,
      },
      history,
      geminiConfigured: isGeminiConfigured(),
    });
  } catch (error) {
    console.error('[api/voters/[id]/ai] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI analysis' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voters/[id]/ai
 * Re-run AI profiling for a voter
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: 'Gemini AI not configured. Set GEMINI_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    const { id } = await params;

    const [voter] = await db.select().from(voters).where(eq(voters.id, id)).limit(1);

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Run profiling
    const profile = await profileVoter(id);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profiling failed' },
        { status: 500 }
      );
    }

    // Get updated voter
    const [updated] = await db.select().from(voters).where(eq(voters.id, id)).limit(1);

    return NextResponse.json({
      profile,
      voter: {
        id: updated?.id,
        aiTier: updated?.aiTier,
        aiSentiment: updated?.aiSentiment,
        aiLastAnalyzed: updated?.aiLastAnalyzed,
        aiAnalysisSummary: updated?.aiAnalysisSummary,
        aiRecommendedAction: updated?.aiRecommendedAction,
      },
    });
  } catch (error) {
    console.error('[api/voters/[id]/ai] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to profile voter' },
      { status: 500 }
    );
  }
}