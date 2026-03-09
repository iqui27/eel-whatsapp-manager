/**
 * CTA Score — heuristic 0-100 for WhatsApp electoral message quality.
 * Pure function, no side effects.
 */

import { SUPPORTED_CAMPAIGN_VARIABLES } from '@/lib/campaign-variables';

const ACTION_VERBS = [
  'vote', 'votar', 'confirme', 'confirmar', 'participe', 'participar',
  'venha', 'venham', 'clique', 'clicar', 'acesse', 'acessar',
  'ligue', 'ligar', 'responda', 'responder', 'apoie', 'apoiar',
  'compartilhe', 'compartilhar', 'conheça', 'conhecer',
];

const VARIABLES = SUPPORTED_CAMPAIGN_VARIABLES.map(variable => variable.key);

const ALL_CAPS_RE = /\b[A-ZÁÉÍÓÚÀÂÊÔÃÕ]{3,}\b/g;
const EXCESSIVE_PUNCT_RE = /[!?]{2,}/g;

export interface CtaScoreResult {
  score: number;
  checks: {
    hasActionVerb: boolean;
    hasVariable: boolean;
    underWordLimit: boolean;
    noAllCaps: boolean;
    noPunctSpam: boolean;
    hasCandidateName: boolean;
  };
  wordCount: number;
}

export function calculateCtaScore(message: string): CtaScoreResult {
  const lower = message.toLowerCase();
  const words = message.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const hasActionVerb = ACTION_VERBS.some(v => lower.includes(v));
  const varCount = VARIABLES.filter(v => message.includes(v)).length;
  const hasVariable = varCount > 0;
  const underWordLimit = wordCount <= 120;
  const noAllCaps = !ALL_CAPS_RE.test(message);
  const noPunctSpam = !EXCESSIVE_PUNCT_RE.test(message);
  const hasCandidateName = message.includes('{candidato}');

  // Scoring
  let score = 10; // base
  if (hasActionVerb) score += 20;
  score += Math.min(varCount, 2) * 15; // max +30 for variables
  if (underWordLimit) score += 15;
  if (noAllCaps) score += 10;
  if (noPunctSpam) score += 10;
  if (hasCandidateName) score += 10;

  return {
    score: Math.min(100, score),
    checks: { hasActionVerb, hasVariable, underWordLimit, noAllCaps, noPunctSpam, hasCandidateName },
    wordCount,
  };
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function scoreBg(score: number): string {
  if (score >= 75) return 'bg-green-500/10 text-green-600 border-green-200';
  if (score >= 50) return 'bg-amber-500/10 text-amber-600 border-amber-200';
  return 'bg-red-500/10 text-red-600 border-red-200';
}
