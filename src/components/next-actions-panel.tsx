'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Smartphone, 
  Users, 
  Send, 
  Database, 
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getActionSuggestions, 
  getActionCounts,
  type SystemState,
} from '@/lib/action-suggestions';

const iconMap = {
  'alert-triangle': AlertTriangle,
  'smartphone': Smartphone,
  'users': Users,
  'send': Send,
  'database': Database,
  'refresh-cw': RefreshCw,
};

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const priorityBgColors = {
  critical: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  high: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
  medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
  low: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
};

interface NextActionsPanelProps {
  systemState: SystemState;
  onNavigate?: (href: string) => void;
  maxItems?: number;
}

export function NextActionsPanel({ 
  systemState, 
  onNavigate,
  maxItems = 5,
}: NextActionsPanelProps) {
  const suggestions = getActionSuggestions(systemState).slice(0, maxItems);
  const counts = getActionCounts(systemState);

  const handleAction = (href?: string) => {
    if (href) {
      if (onNavigate) {
        onNavigate(href);
      } else {
        window.location.href = href;
      }
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card data-tooltip="next-actions-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Tudo em Ordem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma acao pendente. Continue monitorando o sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tooltip="next-actions-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            O que fazer agora
          </CardTitle>
          {(counts.critical > 0 || counts.high > 0) && (
            <div className="flex items-center gap-1">
              {counts.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {counts.critical} critico{counts.critical > 1 ? 's' : ''}
                </Badge>
              )}
              {counts.high > 0 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                  {counts.high} urgente{counts.high > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion) => {
          const Icon = iconMap[suggestion.icon];
          
          return (
            <button
              key={suggestion.id}
              onClick={() => handleAction(suggestion.href)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                'hover:shadow-sm',
                priorityBgColors[suggestion.priority]
              )}
            >
              <div className={cn(
                'w-2 h-2 rounded-full mt-1.5 shrink-0',
                priorityColors[suggestion.priority]
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {suggestion.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {suggestion.resolvedDescription}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {suggestion.action}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}

        {counts.total > maxItems && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{counts.total - maxItems} acao(oes) adicional(is)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export type { SystemState };