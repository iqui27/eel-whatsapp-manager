'use client';

import type { VoterAIInsights } from '@/lib/ai-insights';

interface AIInsightsPanelProps {
  insights: VoterAIInsights;
  onReanalyze?: () => void;
  loading?: boolean;
}

function getTierBadge(tier: string | null) {
  switch (tier) {
    case 'hot':
      return { emoji: '🔥', label: 'Quente', color: 'bg-red-100 text-red-700' };
    case 'warm':
      return { emoji: '☀️', label: 'Morno', color: 'bg-orange-100 text-orange-700' };
    case 'cold':
      return { emoji: '❄️', label: 'Frio', color: 'bg-blue-100 text-blue-700' };
    case 'dead':
      return { emoji: '💀', label: 'Inativo', color: 'bg-gray-100 text-gray-700' };
    default:
      return { emoji: '❓', label: 'Não analisado', color: 'bg-gray-100 text-gray-500' };
  }
}

function getSentimentBadge(sentiment: string | null) {
  switch (sentiment) {
    case 'positive':
      return { emoji: '😊', label: 'Positivo', color: 'text-green-600' };
    case 'negative':
      return { emoji: '😟', label: 'Negativo', color: 'text-red-600' };
    default:
      return { emoji: '😐', label: 'Neutro', color: 'text-gray-600' };
  }
}

function getActionLabel(action: string | null): string {
  switch (action) {
    case 'follow_up':
      return '📞 Fazer follow-up';
    case 'send_offer':
      return '🎁 Enviar oferta';
    case 'add_to_group':
      return '👥 Adicionar ao grupo';
    case 'escalate':
      return '⬆️ Escalar';
    case 'remove':
      return '🚫 Remover';
    default:
      return 'Nenhuma ação recomendada';
  }
}

function formatDate(date: Date | null): string {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AIInsightsPanel({ insights, onReanalyze, loading }: AIInsightsPanelProps) {
  const tierBadge = getTierBadge(insights.tier);
  const sentimentBadge = getSentimentBadge(insights.sentiment);

  return (
    <div className="space-y-4">
      {/* Tier and Sentiment */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${tierBadge.color}`}>
          {tierBadge.emoji} {tierBadge.label}
        </span>
        <span className={`text-sm ${sentimentBadge.color}`}>
          {sentimentBadge.emoji} {sentimentBadge.label}
        </span>
      </div>

      {/* Summary */}
      {insights.summary && (
        <div className="p-3 bg-muted rounded text-sm">
          {insights.summary}
        </div>
      )}

      {/* Recommended Action */}
      {insights.recommendedAction && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <span className="text-blue-700 font-medium text-sm">
            Ação recomendada:
          </span>
          <span className="text-sm">
            {getActionLabel(insights.recommendedAction)}
          </span>
        </div>
      )}

      {/* Last Analyzed */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Última análise: {formatDate(insights.lastAnalyzed)}</span>
        {onReanalyze && (
          <button
            onClick={onReanalyze}
            disabled={loading}
            className="text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Analisando...' : 'Reanalisar'}
          </button>
        )}
      </div>

      {/* Analysis History */}
      {insights.analysisHistory.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Histórico de Análises</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {insights.analysisHistory.map((h) => (
              <div key={h.id} className="text-xs p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <span className={getSentimentBadge(h.sentiment).color}>
                    {getSentimentBadge(h.sentiment).emoji}
                  </span>
                  <span className="text-muted-foreground">
                    {h.intent || 'Intenção desconhecida'}
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    {formatDate(h.createdAt)}
                  </span>
                </div>
                {h.summary && (
                  <p className="mt-1 text-muted-foreground truncate">
                    {h.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}