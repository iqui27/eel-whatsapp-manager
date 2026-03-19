import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getVoter, updateVoter } from '@/lib/db-voters';
import { profileLead, isGeminiConfigured, type VoterDataForProfiling } from '@/lib/gemini';

/**
 * POST /api/voters/analyze
 * Analyze a voter with Gemini 2.0 Flash and persist the results.
 * Body: { voterId: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.edit', 'Sem permissão para analisar eleitores');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as { voterId?: string };
    if (!body.voterId) {
      return NextResponse.json({ error: 'voterId é obrigatório' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'Gemini API não configurada' }, { status: 503 });
    }

    const voter = await getVoter(body.voterId);
    if (!voter) {
      return NextResponse.json({ error: 'Eleitor não encontrado' }, { status: 404 });
    }

    // Build VoterDataForProfiling — the Gemini function will stringify it
    const contextNotes = [
      voter.projectName ? `Projeto: ${voter.projectName}` : null,
      voter.subsecretaria ? `Subsecretaria: ${voter.subsecretaria}` : null,
      voter.eventLocation ? `Local do evento: ${voter.eventLocation}` : null,
      voter.eventDate ? `Data do evento: ${voter.eventDate}` : null,
      voter.address ? `Endereço: ${voter.address}` : null,
      voter.zone ? `Zona: ${voter.zone}` : null,
      voter.neighborhood ? `Bairro: ${voter.neighborhood}` : null,
      voter.optInStatus ? `Opt-in: ${voter.optInStatus}` : null,
      voter.crmNotes ? `Notas: ${voter.crmNotes}` : null,
    ].filter(Boolean).join(' | ');

    const voterData: VoterDataForProfiling = {
      name: voter.name,
      tags: voter.tags ?? [],
      messageHistory: contextNotes ? [contextNotes] : [],
      engagementScore: voter.engagementScore ?? undefined,
      contactCount: voter.contactCount ?? undefined,
      lastContacted: voter.lastContacted ? new Date(voter.lastContacted).toLocaleDateString('pt-BR') : undefined,
    };

    const profile = await profileLead(voterData);

    if (!profile) {
      return NextResponse.json({ error: 'Falha na análise do Gemini' }, { status: 500 });
    }

    // Persist analysis results
    const updated = await updateVoter(voter.id, {
      aiTier: profile.tier,
      engagementScore: profile.engagementPrediction,
      aiAnalysisSummary: profile.summary,
      aiRecommendedAction: profile.recommendedActions?.[0] ?? null,
      aiLastAnalyzed: new Date(),
    });

    return NextResponse.json({
      success: true,
      profile,
      voter: updated,
    });
  } catch (error) {
    console.error('[api/voters/analyze] error:', error);
    return NextResponse.json({ error: 'Erro ao analisar eleitor' }, { status: 500 });
  }
}
