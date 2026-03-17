'use client';

import type { CampaignDeliveryEvent } from '@/db/schema';

interface DeliveryTimelineProps {
  events: CampaignDeliveryEvent[];
  maxEvents?: number;
}

function formatEventTime(date: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date));
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'sent':
      return '📤';
    case 'delivered':
      return '✓';
    case 'read':
      return '✓✓';
    case 'failed':
      return '✗';
    default:
      return '•';
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'sent':
      return 'text-blue-600 bg-blue-50';
    case 'delivered':
      return 'text-green-600 bg-green-50';
    case 'read':
      return 'text-purple-600 bg-purple-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function DeliveryTimeline({ events, maxEvents = 50 }: DeliveryTimelineProps) {
  const displayEvents = events.slice(0, maxEvents);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum evento de entrega registrado.
      </div>
    );
  }

  // Group events by hour
  const groupedEvents = displayEvents.reduce<Record<string, CampaignDeliveryEvent[]>>((acc, event) => {
    if (event.createdAt) {
      const hour = new Date(event.createdAt).toISOString().slice(0, 13);
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(event);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([hour, hourEvents]) => (
        <div key={hour}>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {new Date(hour + ':00:00').toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
            })}h
          </div>
          <div className="space-y-1">
            {hourEvents.map((event, index) => (
              <div
                key={event.id || index}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${getEventColor(event.eventType)}`}
              >
                <span className="font-mono text-lg">{getEventIcon(event.eventType)}</span>
                <span className="flex-1 truncate">
                  {event.voterPhone || 'Número desconhecido'}
                </span>
                <span className="text-xs opacity-75">
                  {formatEventTime(event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {events.length > maxEvents && (
        <div className="text-center text-sm text-muted-foreground pt-2">
          Mostrando {maxEvents} de {events.length} eventos
        </div>
      )}
    </div>
  );
}