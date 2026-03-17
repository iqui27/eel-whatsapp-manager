import { NextRequest, NextResponse } from 'next/server';
import { analyzeMessage, isGeminiConfigured } from '@/lib/gemini';
import { triggerAnalysis, getVoterAnalysisHistory } from '@/lib/ai-analysis';

/**
 * POST /api/ai/analyze
 * Analyze a message using Gemini AI
 */
export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: 'Gemini AI not configured. Set GEMINI_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { messageText, voterPhone, voterId, voterName, voterTags } = body;

    if (!messageText) {
      return NextResponse.json(
        { error: 'messageText is required' },
        { status: 400 }
      );
    }

    // If voterPhone provided, use full trigger (stores in DB)
    if (voterPhone) {
      const result = await triggerAnalysis(voterPhone, messageText, {
        voterId,
        voterName,
        voterTags,
      });

      if (!result) {
        return NextResponse.json(
          { error: 'Analysis failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        analysis: result.analysis,
        stored: result.stored,
      });
    }

    // Otherwise, just analyze without storing
    const analysis = await analyzeMessage(messageText, {
      voterName,
      voterTags,
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[api/ai/analyze] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/analyze
 * Check if AI is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: isGeminiConfigured(),
    model: 'gemini-2.0-flash',
  });
}