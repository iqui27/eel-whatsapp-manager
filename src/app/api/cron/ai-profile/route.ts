import { NextRequest, NextResponse } from 'next/server';
import { isGeminiConfigured } from '@/lib/gemini';
import { profileVoter, getVotersNeedingProfiling } from '@/lib/ai-analysis';
import { db } from '@/db';
import { config } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/cron/ai-profile
 * Batch profile voters using Gemini AI
 * 
 * Run nightly to profile voters without recent analysis.
 */
export async function POST(request: NextRequest) {
  // Auth check (CRON_SECRET or loopback)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow loopback for local development
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded !== '127.0.0.1' && forwarded !== '::1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({
      message: 'Gemini AI not configured',
      configured: false,
    });
  }

  try {
    // Get voters needing profiling (max 100 per run)
    const voterIds = await getVotersNeedingProfiling(100);

    if (voterIds.length === 0) {
      return NextResponse.json({
        message: 'No voters need profiling',
        profiled: 0,
      });
    }

    const results = {
      total: voterIds.length,
      profiled: 0,
      failed: 0,
      tiers: { hot: 0, warm: 0, cold: 0, dead: 0 },
    };

    // Profile each voter
    for (const voterId of voterIds) {
      try {
        const profile = await profileVoter(voterId);
        
        if (profile) {
          results.profiled++;
          results.tiers[profile.tier]++;
        } else {
          results.failed++;
        }

        // Rate limiting: 1 second delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('[cron/ai-profile] Error profiling voter', voterId, error);
        results.failed++;
      }
    }

    // Update last cron run
    await updateLastCronRun();

    console.log('[cron/ai-profile] Completed:', results);

    return NextResponse.json({
      message: 'Batch profiling complete',
      ...results,
    });
  } catch (error) {
    console.error('[cron/ai-profile] Error:', error);
    return NextResponse.json(
      { error: 'Batch profiling failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/ai-profile
 * Get profiling status
 */
export async function GET(request: NextRequest) {
  const [cfg] = await db.select().from(config).limit(1);

  return NextResponse.json({
    configured: isGeminiConfigured(),
    lastCronRun: cfg?.lastCronRun,
  });
}

async function updateLastCronRun() {
  const [cfg] = await db.select().from(config).limit(1);
  if (cfg) {
    await db.update(config)
      .set({ lastCronRun: new Date(), updatedAt: new Date() })
      .where(eq(config.id, cfg.id));
  }
}