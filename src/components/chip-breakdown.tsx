'use client';

import type { Chip } from '@/db/schema';

interface ChipBreakdownItem {
  chipId: string | null;
  chipName: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  failureRate: number;
}

interface ChipBreakdownProps {
  breakdown: ChipBreakdownItem[];
}

function getStatusColor(rate: number, isFailure = false): string {
  if (isFailure) {
    if (rate > 10) return 'text-red-600';
    if (rate > 5) return 'text-orange-600';
    return 'text-green-600';
  }
  
  if (rate >= 95) return 'text-green-600';
  if (rate >= 80) return 'text-yellow-600';
  return 'text-red-600';
}

function getBarColor(rate: number): string {
  if (rate >= 95) return 'bg-green-500';
  if (rate >= 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ChipBreakdown({ breakdown }: ChipBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum chip utilizado nesta campanha.
      </div>
    );
  }

  const totalSent = breakdown.reduce((sum, c) => sum + c.sent, 0);
  const totalDelivered = breakdown.reduce((sum, c) => sum + c.delivered, 0);
  const totalFailed = breakdown.reduce((sum, c) => sum + c.failed, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 pb-4 border-b">
        <div className="text-center">
          <div className="text-xl font-bold">{totalSent.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Enviado</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600">{totalDelivered.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Entregues</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-red-600">{totalFailed.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Falhas</div>
        </div>
      </div>

      {/* Per-chip breakdown */}
      <div className="space-y-3">
        {breakdown.map((chip, index) => (
          <div key={chip.chipId || index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[150px]">{chip.chipName}</span>
              <div className="flex gap-3 text-xs">
                <span className={getStatusColor(chip.deliveryRate)}>
                  {chip.deliveryRate}% entregue
                </span>
                {chip.failureRate > 0 && (
                  <span className={getStatusColor(chip.failureRate, true)}>
                    {chip.failureRate}% falha
                  </span>
                )}
              </div>
            </div>
            
            {/* Stats row */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Enviado: {chip.sent}</span>
              <span>Entregue: {chip.delivered}</span>
              <span>Falha: {chip.failed}</span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              <div
                className={`h-full ${getBarColor(chip.deliveryRate)}`}
                style={{ width: `${chip.deliveryRate}%` }}
              />
              {chip.failureRate > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${chip.failureRate}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Warning for high failure rates */}
      {breakdown.some(c => c.failureRate > 10) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ⚠️ Um ou mais chips têm taxa de falha elevada (&gt;10%). Considere verificar a saúde dos chips.
        </div>
      )}
    </div>
  );
}