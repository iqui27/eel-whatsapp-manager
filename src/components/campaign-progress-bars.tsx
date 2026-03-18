'use client';

import Link from 'next/link';

interface CampaignProgressData {
  id: string;
  name: string;
  status: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  queued?: number;
}

interface CampaignProgressBarsProps {
  campaigns: CampaignProgressData[];
  loading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  sending: 'Enviando',
  sent: 'Concluído',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function CampaignProgressBars({ campaigns, loading }: CampaignProgressBarsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border p-3 animate-pulse h-16 bg-muted" />
        ))}
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => 
    c.status === 'sending' || c.status === 'scheduled'
  );

  if (activeCampaigns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma campanha ativa no momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeCampaigns.map((campaign) => {
        const total = campaign.totalSent + (campaign.queued || 0);
        const delivered = campaign.totalDelivered;
        const failed = campaign.totalFailed;
        const pending = campaign.queued || (total - campaign.totalSent);
        
        const deliveredPct = total > 0 ? (delivered / total) * 100 : 0;
        const failedPct = total > 0 ? (failed / total) * 100 : 0;
        const pendingPct = total > 0 ? (pending / total) * 100 : 0;
        
        return (
          <Link
            key={campaign.id}
            href={`/campanhas/${campaign.id}`}
            className="block rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm line-clamp-1" title={campaign.name}>
                {campaign.name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[campaign.status] || 'bg-gray-100'}`}>
                {STATUS_LABELS[campaign.status] || campaign.status}
              </span>
            </div>
            
            {/* Progress bar with segments */}
            {total > 0 && (
              <div className="space-y-1.5">
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  {deliveredPct > 0 && (
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${deliveredPct}%` }}
                      title={`Entregues: ${delivered}`}
                    />
                  )}
                  {failedPct > 0 && (
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${failedPct}%` }}
                      title={`Falhas: ${failed}`}
                    />
                  )}
                  {pendingPct > 0 && (
                    <div
                      className="bg-gray-300 h-full"
                      style={{ width: `${pendingPct}%` }}
                      title={`Pendentes: ${pending}`}
                    />
                  )}
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {delivered > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {delivered} entregues
                    </span>
                  )}
                  {failed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {failed} falhas
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      {pending} pendentes
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {total === 0 && (
              <div className="text-xs text-muted-foreground">
                Aguardando envio...
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}