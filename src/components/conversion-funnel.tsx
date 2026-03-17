'use client';

import type { FunnelData } from '@/app/api/campaigns/[id]/funnel/route';

interface ConversionFunnelProps {
  data: FunnelData;
  compact?: boolean;
}

interface FunnelStage {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export function ConversionFunnel({ data, compact = false }: ConversionFunnelProps) {
  const stages: FunnelStage[] = [
    { label: 'Total', count: data.total, percent: 100, color: 'bg-gray-400' },
    { label: 'Enviados', count: data.sent, percent: data.percentages.sent, color: 'bg-blue-500' },
    { label: 'Entregues', count: data.delivered, percent: data.percentages.delivered, color: 'bg-green-500' },
    { label: 'Lidos', count: data.read, percent: data.percentages.read, color: 'bg-purple-500' },
    { label: 'Respondidos', count: data.replied, percent: data.percentages.replied, color: 'bg-orange-500' },
    { label: 'Entraram no Grupo', count: data.joinedGroup, percent: data.percentages.joinedGroup, color: 'bg-emerald-500' },
  ];

  const failedRate = data.sent > 0 ? Math.round((data.failed / data.sent) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.slice(1).map((stage, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`${stage.color} h-2 rounded`}
              style={{ width: `${Math.max(stage.percent, 5)}px` }}
              title={`${stage.label}: ${stage.count} (${stage.percent}%)`}
            />
            {index < stages.length - 2 && <span className="text-muted-foreground mx-1">→</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Visual funnel */}
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{stage.label}</span>
              <span className="text-muted-foreground">
                {stage.count.toLocaleString()} ({stage.percent}%)
              </span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${stage.color} transition-all duration-500`}
                style={{ width: `${stage.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Failed indicator */}
      {data.failed > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <span className="font-medium">Falhas:</span>
          <span>{data.failed.toLocaleString()} ({failedRate}%)</span>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.percentages.delivered}%
          </div>
          <div className="text-xs text-muted-foreground">Taxa de Entrega</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data.percentages.read}%
          </div>
          <div className="text-xs text-muted-foreground">Taxa de Leitura</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {data.percentages.joinedGroup}%
          </div>
          <div className="text-xs text-muted-foreground">Conversões</div>
        </div>
      </div>
    </div>
  );
}