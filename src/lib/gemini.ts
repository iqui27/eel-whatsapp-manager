/**
 * Google Gemini AI Integration
 * Phase 18 - AI Lead Analysis
 * 
 * Uses Gemini Flash for real-time message analysis and lead profiling.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: 'support' | 'question' | 'complaint' | 'interest' | 'spam' | 'other';
  suggestedTags: string[];
  recommendedAction: 'follow_up' | 'send_offer' | 'add_to_group' | 'escalate' | 'remove' | 'none';
  confidence: number;
  summary: string;
}

export interface LeadProfile {
  tier: 'hot' | 'warm' | 'cold' | 'dead';
  engagementPrediction: number;
  bestContactTime: 'morning' | 'afternoon' | 'evening';
  recommendedActions: string[];
  summary: string;
}

export interface AnalysisContext {
  voterName?: string;
  voterTags?: string[];
  previousMessages?: string[];
  campaignContext?: string;
}

// ─── Gemini Client ────────────────────────────────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

/**
 * Get or initialize the Gemini client
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('[gemini] GEMINI_API_KEY not configured');
    return null;
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  
  return genAI;
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// ─── Message Analysis ──────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `Você é um assistente de análise de mensagens para uma campanha eleitoral no Brasil.

Analise a seguinte mensagem de um eleitor e retorne um JSON com:

1. "sentiment": "positive" | "neutral" | "negative" - O sentimento geral da mensagem
2. "intent": "support" | "question" | "complaint" | "interest" | "spam" | "other" - A intenção do eleitor
3. "suggestedTags": string[] - Tags relevantes para categorizar o eleitor (ex: "apoiador", "dúvida-saúde", "reclamação")
4. "recommendedAction": "follow_up" | "send_offer" | "add_to_group" | "escalate" | "remove" | "none" - Ação recomendada
5. "confidence": número de 0 a 100 - Confiança na análise
6. "summary": string - Resumo breve da mensagem e contexto

Contexto do eleitor:
{{CONTEXT}}

Mensagem do eleitor:
{{MESSAGE}}

Retorne APENAS o JSON, sem formatação adicional.`;

/**
 * Analyze a message using Gemini
 */
export async function analyzeMessage(
  messageText: string,
  context?: AnalysisContext
): Promise<MessageAnalysis | null> {
  const client = getGeminiClient();
  
  if (!client) {
    return null;
  }
  
  try {
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' });
    
    // Build context string
    const contextParts: string[] = [];
    if (context?.voterName) {
      contextParts.push(`Nome: ${context.voterName}`);
    }
    if (context?.voterTags?.length) {
      contextParts.push(`Tags atuais: ${context.voterTags.join(', ')}`);
    }
    if (context?.previousMessages?.length) {
      contextParts.push(`Mensagens anteriores:\n${context.previousMessages.slice(-3).join('\n')}`);
    }
    if (context?.campaignContext) {
      contextParts.push(`Contexto da campanha: ${context.campaignContext}`);
    }
    
    const contextStr = contextParts.length > 0 
      ? contextParts.join('\n')
      : 'Sem contexto adicional.';
    
    const prompt = ANALYSIS_PROMPT
      .replace('{{CONTEXT}}', contextStr)
      .replace('{{MESSAGE}}', messageText);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[gemini] No JSON found in response:', response);
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      sentiment: parsed.sentiment || 'neutral',
      intent: parsed.intent || 'other',
      suggestedTags: parsed.suggestedTags || [],
      recommendedAction: parsed.recommendedAction || 'none',
      confidence: parsed.confidence || 50,
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('[gemini] Analysis error:', error);
    return null;
  }
}

// ─── Lead Profiling ────────────────────────────────────────────────────────────

const PROFILING_PROMPT = `Você é um assistente de análise de leads para uma campanha eleitoral no Brasil.

Com base nos dados do eleitor, determine o perfil e retorne um JSON com:

1. "tier": "hot" | "warm" | "cold" | "dead" - Classificação do lead
   - hot: Muito interessado, provável apoiador/voto
   - warm: Interessado, precisa de acompanhamento
   - cold: Pouco engajamento, precisa de estímulo
   - dead: Sem interesse ou inalcançável

2. "engagementPrediction": número de 0 a 100 - Probabilidade de engajamento
3. "bestContactTime": "morning" | "afternoon" | "evening" - Melhor horário para contato
4. "recommendedActions": string[] - Ações recomendadas (até 3)
5. "summary": string - Resumo do perfil

Dados do eleitor:
{{VOTER_DATA}}

Retorne APENAS o JSON, sem formatação adicional.`;

export interface VoterDataForProfiling {
  name: string;
  tags: string[];
  messageHistory: string[];
  engagementScore?: number;
  contactCount?: number;
  lastContacted?: string;
}

/**
 * Profile a lead using Gemini
 */
export async function profileLead(
  voterData: VoterDataForProfiling
): Promise<LeadProfile | null> {
  const client = getGeminiClient();
  
  if (!client) {
    return null;
  }
  
  try {
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' });
    
    // Build voter data string
    const dataParts: string[] = [];
    dataParts.push(`Nome: ${voterData.name}`);
    if (voterData.tags.length > 0) {
      dataParts.push(`Tags: ${voterData.tags.join(', ')}`);
    }
    if (voterData.engagementScore !== undefined) {
      dataParts.push(`Score de engajamento: ${voterData.engagementScore}`);
    }
    if (voterData.contactCount !== undefined) {
      dataParts.push(`Contatos: ${voterData.contactCount}`);
    }
    if (voterData.lastContacted) {
      dataParts.push(`Último contato: ${voterData.lastContacted}`);
    }
    if (voterData.messageHistory.length > 0) {
      dataParts.push(`Histórico de mensagens:\n${voterData.messageHistory.slice(-5).join('\n')}`);
    }
    
    const voterDataStr = dataParts.join('\n');
    
    const prompt = PROFILING_PROMPT.replace('{{VOTER_DATA}}', voterDataStr);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[gemini] No JSON found in response:', response);
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      tier: parsed.tier || 'cold',
      engagementPrediction: parsed.engagementPrediction || 30,
      bestContactTime: parsed.bestContactTime || 'afternoon',
      recommendedActions: parsed.recommendedActions || [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('[gemini] Profiling error:', error);
    return null;
  }
}

// ─── Quick Analysis ────────────────────────────────────────────────────────────

/**
 * Quick sentiment check for a message
 */
export async function quickSentimentCheck(messageText: string): Promise<'positive' | 'neutral' | 'negative'> {
  const analysis = await analyzeMessage(messageText);
  return analysis?.sentiment || 'neutral';
}