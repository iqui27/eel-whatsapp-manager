/**
 * Google Gemini AI Integration
 * Phase 18 - AI Lead Analysis
 * 
 * Uses Gemini Flash for real-time message analysis and lead profiling.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { syslog } from '@/lib/system-logger';

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
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  
  if (!client) {
    return null;
  }

  const start = Date.now();
  
  try {
    const model = client.getGenerativeModel({ model: modelName });
    
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
      syslog({ level: 'warn', category: 'gemini', message: 'analyzeMessage — JSON não encontrado na resposta', durationMs: Date.now() - start, details: { model: modelName, voter: context?.voterName } });
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);

    syslog({ level: 'info', category: 'gemini', message: `analyzeMessage — ${parsed.sentiment ?? '?'} / ${parsed.intent ?? '?'}`, durationMs: Date.now() - start, details: { model: modelName, voter: context?.voterName, confidence: parsed.confidence } });
    
    return {
      sentiment: parsed.sentiment || 'neutral',
      intent: parsed.intent || 'other',
      suggestedTags: parsed.suggestedTags || [],
      recommendedAction: parsed.recommendedAction || 'none',
      confidence: parsed.confidence || 50,
      summary: parsed.summary || '',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[gemini] Analysis error:', error);
    syslog({ level: 'error', category: 'gemini', message: `analyzeMessage — ERRO: ${errMsg}`, durationMs: Date.now() - start, details: { model: modelName, voter: context?.voterName, error: errMsg } });
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
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  
  if (!client) {
    return null;
  }

  const start = Date.now();
  
  try {
    const model = client.getGenerativeModel({ model: modelName });
    
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
      syslog({ level: 'warn', category: 'gemini', message: `profileLead — JSON não encontrado: ${voterData.name}`, durationMs: Date.now() - start, details: { model: modelName, voter: voterData.name } });
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);

    syslog({ level: 'info', category: 'gemini', message: `profileLead — ${voterData.name}: tier=${parsed.tier ?? '?'} engagement=${parsed.engagementPrediction ?? '?'}%`, durationMs: Date.now() - start, details: { model: modelName, voter: voterData.name, tier: parsed.tier, engagement: parsed.engagementPrediction } });
    
    return {
      tier: parsed.tier || 'cold',
      engagementPrediction: parsed.engagementPrediction || 30,
      bestContactTime: parsed.bestContactTime || 'afternoon',
      recommendedActions: parsed.recommendedActions || [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[gemini] Profiling error:', error);
    syslog({ level: 'error', category: 'gemini', message: `profileLead — ERRO: ${voterData.name}: ${errMsg}`, durationMs: Date.now() - start, details: { model: modelName, voter: voterData.name, error: errMsg } });
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

// ─── Message Generation ────────────────────────────────────────────────────────

const MESSAGE_GENERATION_SYSTEM_PROMPT = `Você é um especialista em marketing político eleitoral via WhatsApp.
Regras:
- Mensagens devem ser em português brasileiro
- Use linguagem direta e pessoal
- Inclua variáveis de personalização quando apropriado: {nome}, {bairro}, {candidato}
- Respeite o limite de caracteres solicitado
- Mensagens devem seguir boas práticas de WhatsApp (parágrafos curtos, sem muita formatação)
- Nunca inclua conteúdo ofensivo, fake news, ou promessas ilegais
- Use formatação WhatsApp quando apropriado: *bold* para destaques, _italic_ para ênfase`;

export interface GenerateMessageResult {
  message: string;
  suggestions: string[];
}

export interface ImproveMessageResult {
  improved: string;
  changes: string[];
}

export interface RewriteMessageResult {
  rewritten: string;
}

/**
 * Generate a new campaign message from a prompt
 */
export async function generateMessage(params: {
  prompt: string;
  tone?: 'formal' | 'informal' | 'friendly' | 'urgent';
  maxLength?: number;
  candidateName?: string;
  segmentDescription?: string;
  includeVariables?: boolean;
}): Promise<GenerateMessageResult | null> {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  if (!client) return null;

  const start = Date.now();
  const {
    prompt,
    tone = 'informal',
    maxLength = 500,
    candidateName,
    segmentDescription,
    includeVariables = true,
  } = params;

  const toneMap = {
    formal: 'formal e profissional',
    informal: 'informal e próximo',
    friendly: 'amigável e caloroso',
    urgent: 'urgente e direto',
  };

  const contextLines: string[] = [];
  if (candidateName) contextLines.push(`Candidato: ${candidateName}`);
  if (segmentDescription) contextLines.push(`Público-alvo: ${segmentDescription}`);
  contextLines.push(`Tom: ${toneMap[tone]}`);
  contextLines.push(`Limite de caracteres: ${maxLength}`);
  if (includeVariables) contextLines.push('Inclua variáveis como {nome}, {bairro}, {candidato} quando natural');

  const userPrompt = `${MESSAGE_GENERATION_SYSTEM_PROMPT}

${contextLines.join('\n')}

Descrição da mensagem desejada:
${prompt}

Retorne um JSON com:
1. "message": string — a mensagem gerada
2. "suggestions": string[] — até 3 variações alternativas curtas

Retorne APENAS o JSON, sem formatação adicional.`;

  try {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(userPrompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      syslog({ level: 'warn', category: 'gemini', message: 'generateMessage — JSON não encontrado na resposta', durationMs: Date.now() - start, details: { model: modelName } });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    syslog({ level: 'info', category: 'gemini', message: 'generateMessage — mensagem gerada com sucesso', durationMs: Date.now() - start, details: { model: modelName, tone, chars: parsed.message?.length } });

    return {
      message: parsed.message || '',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    syslog({ level: 'error', category: 'gemini', message: `generateMessage — ERRO: ${errMsg}`, durationMs: Date.now() - start, details: { model: modelName, error: errMsg } });
    return null;
  }
}

/**
 * Improve an existing message (fix grammar, improve tone, add persuasion)
 */
export async function improveMessage(params: {
  message: string;
  instruction?: string;
  candidateName?: string;
}): Promise<ImproveMessageResult | null> {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  if (!client) return null;

  const start = Date.now();
  const { message, instruction, candidateName } = params;

  const contextLines: string[] = [];
  if (candidateName) contextLines.push(`Candidato: ${candidateName}`);
  if (instruction) contextLines.push(`Instrução específica: ${instruction}`);

  const userPrompt = `${MESSAGE_GENERATION_SYSTEM_PROMPT}

${contextLines.join('\n')}

Mensagem original:
${message}

Melhore esta mensagem mantendo a essência mas ${instruction || 'tornando-a mais eficaz e persuasiva'}.

Retorne um JSON com:
1. "improved": string — a mensagem melhorada
2. "changes": string[] — lista do que foi alterado (até 5 itens)

Retorne APENAS o JSON, sem formatação adicional.`;

  try {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(userPrompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      syslog({ level: 'warn', category: 'gemini', message: 'improveMessage — JSON não encontrado na resposta', durationMs: Date.now() - start, details: { model: modelName } });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    syslog({ level: 'info', category: 'gemini', message: 'improveMessage — mensagem melhorada com sucesso', durationMs: Date.now() - start, details: { model: modelName, instruction } });

    return {
      improved: parsed.improved || '',
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    syslog({ level: 'error', category: 'gemini', message: `improveMessage — ERRO: ${errMsg}`, durationMs: Date.now() - start, details: { model: modelName, error: errMsg } });
    return null;
  }
}

// ─── Campaign Performance Analysis ───────────────────────────────────────────

export interface CampaignPerformanceAnalysis {
  overallScore: number;       // 0-100 performance score
  summary: string;            // "Campanha com bom desempenho, taxa de leitura acima da média"
  insights: string[];         // ["Taxa de resposta 15% acima da média para este segmento", ...]
  recommendations: string[];  // ["Considere enviar follow-up para quem leu mas não respondeu", ...]
  riskFactors: string[];      // ["Taxa de bloqueio alta (>3%), reduzir velocidade de envio", ...]
}

const CAMPAIGN_ANALYSIS_SYSTEM_PROMPT = `Você é um analista de campanhas eleitorais via WhatsApp.
Analise os dados da campanha e forneça um JSON com:
1. "overallScore": número de 0 a 100 — score geral baseado em taxas de entrega, leitura, resposta e bloqueio
2. "summary": string — resumo executivo em 1-2 frases
3. "insights": string[] — insights específicos sobre o desempenho (até 4 itens)
4. "recommendations": string[] — recomendações acionáveis para melhorar resultados (até 4 itens)
5. "riskFactors": string[] — fatores de risco que precisam atenção (até 3 itens, vazio se não houver)

Benchmarks de referência (WhatsApp político):
- Taxa de entrega: >95% é bom, <90% é preocupante
- Taxa de leitura: >70% é bom, <50% é preocupante
- Taxa de resposta: >10% é bom, >20% é excelente
- Taxa de bloqueio: <1% é aceitável, >3% é crítico

Retorne APENAS o JSON, sem formatação adicional.`;

/**
 * Analyze campaign performance using Gemini
 */
export async function analyzeCampaignPerformance(params: {
  campaignName: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalFailed: number;
  totalBlocked: number;
  messageTemplate: string;
  segmentDescription?: string;
  duration?: string;
}): Promise<CampaignPerformanceAnalysis | null> {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  if (!client) return null;

  const start = Date.now();
  const {
    campaignName,
    totalSent,
    totalDelivered,
    totalRead,
    totalReplied,
    totalFailed,
    totalBlocked,
    messageTemplate,
    segmentDescription,
    duration,
  } = params;

  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
  const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
  const blockRate = totalSent > 0 ? Math.round((totalBlocked / totalSent) * 100) : 0;
  const failureRate = totalSent > 0 ? Math.round((totalFailed / totalSent) * 100) : 0;

  const dataLines: string[] = [
    `Campanha: ${campaignName}`,
    `Total enviado: ${totalSent}`,
    `Entregue: ${totalDelivered} (${deliveryRate}%)`,
    `Lido: ${totalRead} (${readRate}% dos entregues)`,
    `Respondido: ${totalReplied} (${replyRate}% dos enviados)`,
    `Falhou: ${totalFailed} (${failureRate}%)`,
    `Bloqueado: ${totalBlocked} (${blockRate}%)`,
  ];

  if (segmentDescription) dataLines.push(`Segmento: ${segmentDescription}`);
  if (duration) dataLines.push(`Duração: ${duration}`);
  if (messageTemplate) {
    const preview = messageTemplate.slice(0, 200) + (messageTemplate.length > 200 ? '...' : '');
    dataLines.push(`Template (prévia): ${preview}`);
  }

  const userPrompt = `${CAMPAIGN_ANALYSIS_SYSTEM_PROMPT}

Dados da campanha:
${dataLines.join('\n')}`;

  try {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(userPrompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      syslog({ level: 'warn', category: 'gemini', message: `analyzeCampaignPerformance — JSON não encontrado: ${campaignName}`, durationMs: Date.now() - start, details: { model: modelName, campaign: campaignName } });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    syslog({ level: 'info', category: 'gemini', message: `analyzeCampaignPerformance — score=${parsed.overallScore ?? '?'}: ${campaignName}`, durationMs: Date.now() - start, details: { model: modelName, campaign: campaignName, score: parsed.overallScore } });

    return {
      overallScore: typeof parsed.overallScore === 'number' ? Math.min(100, Math.max(0, parsed.overallScore)) : 50,
      summary: parsed.summary || '',
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    syslog({ level: 'error', category: 'gemini', message: `analyzeCampaignPerformance — ERRO: ${campaignName}: ${errMsg}`, durationMs: Date.now() - start, details: { model: modelName, campaign: campaignName, error: errMsg } });
    return null;
  }
}

/**
 * Rewrite message in a completely different style
 */
export async function rewriteMessage(params: {
  message: string;
  style: 'shorter' | 'longer' | 'more_formal' | 'more_casual' | 'more_persuasive';
  candidateName?: string;
}): Promise<RewriteMessageResult | null> {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  if (!client) return null;

  const start = Date.now();
  const { message, style, candidateName } = params;

  const styleMap = {
    shorter: 'muito mais curta (máximo 50% do tamanho original)',
    longer: 'mais longa e detalhada (pelo menos 150% do tamanho original)',
    more_formal: 'formal e profissional',
    more_casual: 'casual e descontraída',
    more_persuasive: 'mais persuasiva e com apelo emocional',
  };

  const contextLines: string[] = [];
  if (candidateName) contextLines.push(`Candidato: ${candidateName}`);

  const userPrompt = `${MESSAGE_GENERATION_SYSTEM_PROMPT}

${contextLines.join('\n')}

Mensagem original:
${message}

Reescreva esta mensagem tornando-a ${styleMap[style]}.

Retorne um JSON com:
1. "rewritten": string — a mensagem reescrita

Retorne APENAS o JSON, sem formatação adicional.`;

  try {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(userPrompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      syslog({ level: 'warn', category: 'gemini', message: 'rewriteMessage — JSON não encontrado na resposta', durationMs: Date.now() - start, details: { model: modelName } });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    syslog({ level: 'info', category: 'gemini', message: 'rewriteMessage — mensagem reescrita com sucesso', durationMs: Date.now() - start, details: { model: modelName, style } });

    return {
      rewritten: parsed.rewritten || '',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    syslog({ level: 'error', category: 'gemini', message: `rewriteMessage — ERRO: ${errMsg}`, durationMs: Date.now() - start, details: { model: modelName, error: errMsg } });
    return null;
  }
}
