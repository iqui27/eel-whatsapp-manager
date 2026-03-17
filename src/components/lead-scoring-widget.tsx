'use client';

import type { AILeadStats } from '@/lib/ai-insights';

interface LeadScoringWidgetProps {
  stats: AILeadStats;
  compact?: boolean;
}

export function LeadScoringWidget({ stats, compact = false }: LeadScoringWidgetProps) {
  const total = stats.tiers.hot + stats.tiers.warm + stats.tiers.cold + stats.tiers.dead;
  
  // Calculate percentages
  const percentages = {
    hot: total > 0 ? Math.round((stats.tiers.hot / total) * 100) : 0,
    warm: total > 0 ? Math.round((stats.tiers.warm / total) * 100) : 0,
    cold: total > 0 ? Math.round((stats.tiers.cold / total) * 100) : 0,
    dead: total > 0 ? Math.round((stats.tiers.dead / total) * 100) : 0,
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-3 w-24 rounded overflow-hidden">
          <div className="bg-red-500 h-full" style={{ width: `${percentages.hot}%` }} />
          <div className="bg-orange-400 h-full" style={{ width: `${percentages.warm}%` }} />
          <div className="bg-blue-400 h-full" style={{ width: `${percentages.cold}%` }} />
          <div className="bg-gray-400 h-full" style={{ width: `${percentages.dead}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{total} analisados</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual bar */}
      <div className="flex h-4 rounded-full overflow-hidden">
        <div 
          className="bg-red-500 h-full transition-all" 
          style={{ width: `${percentages.hot}%` }}
          title={`Quentes: ${stats.tiers.hot} (${percentages.hot}%)`}
        />
        <div 
          className="bg-orange-400 h-full transition-all" 
          style={{ width: `${percentages.warm}%` }}
          title={`Mornos: ${stats.tiers.warm} (${percentages.warm}%)`}
        />
        <div 
          className="bg-blue-400 h-full transition-all" 
          style={{ width: `${percentages.cold}%` }}
          title={`Frios: ${stats.tiers.cold} (${percentages.cold}%)`}
        />
        <div 
          className="bg-gray-400 h-full transition-all" 
          style={{ width: `${percentages.dead}%` }}
          title={`Inativos: ${stats.tiers.dead} (${percentages.dead}%)`}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>🔥 Quentes</span>
          <span className="ml-auto font-medium">{stats.tiers.hot}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-400" />
          <span>☀️ Mornos</span>
          <span className="ml-auto font-medium">{stats.tiers.warm}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-400" />
          <span>❄️ Frios</span>
          <span className="ml-auto font-medium">{stats.tiers.cold}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400" />
          <span>💀 Inativos</span>
          <span className="ml-auto font-medium">{stats.tiers.dead}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="pt-2 border-t text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Total de eleitores:</span>
          <span>{stats.total}</span>
        </div>
        <div className="flex justify-between">
          <span>Analisados:</span>
          <span>{stats.analyzed}</span>
        </div>
        <div className="flex justify-between">
          <span>Pendentes:</span>
          <span>{stats.notAnalyzed}</span>
        </div>
      </div>
    </div>
  );
}