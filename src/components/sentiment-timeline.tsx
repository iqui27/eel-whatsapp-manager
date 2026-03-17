'use client';

interface SentimentEvent {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  summary: string | null;
  createdAt: Date;
}

interface SentimentTimelineProps {
  events: SentimentEvent[];
  maxEvents?: number;
}

function getSentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-500';
    case 'negative':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SentimentTimeline({ events, maxEvents = 20 }: SentimentTimelineProps) {
  const displayEvents = events.slice(0, maxEvents);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma análise de sentimento registrada.
      </div>
    );
  }

  // Group by date
  const groupedEvents = displayEvents.reduce<Record<string, SentimentEvent[]>>((acc, event) => {
    const date = new Date(event.createdAt).toLocaleDateString('pt-BR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date}>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {date}
          </div>
          
          {/* Timeline line */}
          <div className="relative pl-4 border-l-2 border-muted">
            {dateEvents.map((event, index) => (
              <div key={event.id} className="relative mb-3 last:mb-0">
                {/* Dot */}
                <div
                  className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ${getSentimentColor(event.sentiment)} border-2 border-background`}
                  title={event.sentiment || 'Neutro'}
                />
                
                {/* Content */}
                <div className="pl-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">
                      {event.sentiment === 'positive' ? 'Positivo' : 
                       event.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTime(event.createdAt)}
                    </span>
                  </div>
                  {event.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {events.length > maxEvents && (
        <div className="text-center text-xs text-muted-foreground pt-2">
          Mostrando {maxEvents} de {events.length} eventos
        </div>
      )}
    </div>
  );
}