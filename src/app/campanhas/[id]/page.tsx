import { notFound } from 'next/navigation';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ConversionFunnel } from '@/components/conversion-funnel';
import { DeliveryTimeline } from '@/components/delivery-timeline';
import { ChipBreakdown } from '@/components/chip-breakdown';
import type { FunnelData } from '@/app/api/campaigns/[id]/funnel/route';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getCampaignAnalytics(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/campaigns/${id}/analytics`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Get campaign
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);

  if (!campaign) {
    notFound();
  }

  // Get analytics
  const analytics = await getCampaignAnalytics(id);

  const funnel: FunnelData = analytics?.funnel ?? {
    campaignId: id,
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    clicked: 0,
    joinedGroup: 0,
    failed: 0,
    percentages: { sent: 0, delivered: 0, read: 0, replied: 0, clicked: 0, joinedGroup: 0 },
  };

  const timeline = analytics?.timeline ?? [];
  const chipBreakdown = analytics?.chipBreakdown ?? [];
  const alerts = analytics?.alerts ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadge(campaign.status ?? 'draft')}`}>
              {campaign.status ?? 'draft'}
            </span>
            <span className="text-sm text-muted-foreground">
              Criada em {formatDate(campaign.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/campanhas/${id}/mensagens`}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Ver mensagens
          </a>
          <a
            href="/campanhas"
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
          >
            ← Voltar
          </a>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: { type: string; message: string }, index: number) => (
            <div
              key={index}
              className={`p-3 rounded text-sm ${
                alert.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              }`}
            >
              {alert.type === 'error' ? '⚠️' : '⚡'} {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Conversion Funnel */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Funil de Conversão</h2>
        <ConversionFunnel data={funnel} />
      </div>

      {/* Two columns: Timeline + Chip Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Delivery Timeline */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Timeline de Entregas</h2>
          <DeliveryTimeline events={timeline} />
        </div>

        {/* Chip Breakdown */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Performance por Chip</h2>
          <ChipBreakdown breakdown={chipBreakdown} />
        </div>
      </div>

      {/* Campaign Details */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Detalhes da Campanha</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Template:</span>
            <p className="mt-1 p-3 bg-muted rounded">{campaign.template}</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agendado para:</span>
              <span>{formatDate(campaign.scheduledAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Janela de envio:</span>
              <span>{campaign.windowStart} - {campaign.windowEnd}</span>
            </div>
            {campaign.abEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teste A/B:</span>
                <span>Ativo ({campaign.abSplitPercent}% / {100 - (campaign.abSplitPercent || 50)}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}