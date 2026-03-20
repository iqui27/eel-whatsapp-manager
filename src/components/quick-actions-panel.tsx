'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Send, 
  Smartphone, 
  Users, 
  Database, 
  BarChart3,
  Settings,
  FileText,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  shortcut?: string;
  category: 'create' | 'manage' | 'view';
  contextInfo?: string; // e.g., "3 chips offline", "1.234 eleitores"
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create-campaign',
    label: 'Nova Campanha',
    icon: Send,
    href: '/campanhas/nova',
    shortcut: 'C',
    category: 'create',
  },
  {
    id: 'setup-wizard',
    label: 'Setup Wizard',
    icon: Zap,
    href: '/wizard',
    shortcut: 'W',
    category: 'create',
  },
  {
    id: 'add-chip',
    label: 'Adicionar Chip',
    icon: Smartphone,
    href: '/chips',
    shortcut: 'Ch',
    category: 'create',
  },
  {
    id: 'sync-groups',
    label: 'Sincronizar Grupos',
    icon: Users,
    href: '/grupos',
    shortcut: 'G',
    category: 'manage',
  },
  {
    id: 'import-voters',
    label: 'Importar Eleitores',
    icon: Database,
    href: '/segmentacao/importar',
    shortcut: 'I',
    category: 'create',
  },
  {
    id: 'view-reports',
    label: 'Ver Relatórios',
    icon: BarChart3,
    href: '/relatorios',
    shortcut: 'R',
    category: 'view',
  },
  {
    id: 'view-conversations',
    label: 'Conversas',
    icon: FileText,
    href: '/conversas',
    shortcut: 'Co',
    category: 'view',
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: Settings,
    href: '/configuracoes',
    shortcut: 'S',
    category: 'manage',
  },
];

export interface RecentAction {
  id: string;
  label: string;
  timestamp: Date;
  href?: string;
}

interface QuickActionsPanelProps {
  actions?: QuickAction[];
  recentActions?: RecentAction[];
  onActionClick?: (action: QuickAction) => void;
  maxRecentActions?: number;
  systemContext?: {
    chipsOffline?: number;
    chipsTotal?: number;
    voterCount?: number;
    groupCount?: number;
    campaignCount?: number;
  };
}

export function QuickActionsPanel({
  actions = DEFAULT_QUICK_ACTIONS,
  recentActions = [],
  onActionClick,
  maxRecentActions = 5,
  systemContext,
}: QuickActionsPanelProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const createActions = actions.filter((a) => a.category === 'create');
  const manageActions = actions.filter((a) => a.category === 'manage');
  const viewActions = actions.filter((a) => a.category === 'view');

  const displayedRecentActions = recentActions.slice(0, maxRecentActions);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Compute contextual info from systemContext
  const getContextInfo = (actionId: string): string | undefined => {
    if (!systemContext) return undefined;
    const { chipsOffline = 0, chipsTotal = 0, voterCount = 0, groupCount = 0, campaignCount = 0 } = systemContext;
    switch (actionId) {
      case 'create-campaign':
        return campaignCount > 0 ? `${campaignCount} campanhas` : undefined;
      case 'add-chip':
        return chipsTotal > 0
          ? chipsOffline > 0 ? `${chipsOffline} offline de ${chipsTotal}` : `${chipsTotal} conectados`
          : undefined;
      case 'import-voters':
        return voterCount > 0 ? `${voterCount.toLocaleString('pt-BR')} eleitores` : undefined;
      case 'sync-groups':
        return groupCount > 0 ? `${groupCount} grupos` : undefined;
      default:
        return undefined;
    }
  };

  const renderAction = (action: QuickAction) => {
    const Icon = action.icon;
    const isHovered = hoveredAction === action.id;
    const contextInfo = action.contextInfo ?? getContextInfo(action.id);

    const content = (
      <>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <span className="block text-sm truncate">{action.label}</span>
          {contextInfo && (
            <span className="block text-xs text-muted-foreground truncate">{contextInfo}</span>
          )}
        </div>
        {action.shortcut && (
          <kbd className="hidden sm:inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground shrink-0">
            {action.shortcut}
          </kbd>
        )}
      </>
    );

    if (action.href) {
      return (
        <Link
          key={action.id}
          href={action.href}
          onMouseEnter={() => setHoveredAction(action.id)}
          onMouseLeave={() => setHoveredAction(null)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
            'hover:bg-muted/50 hover:shadow-sm',
            isHovered && 'bg-muted/50'
          )}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={action.id}
        onClick={() => action.onClick?.()}
        onMouseEnter={() => setHoveredAction(action.id)}
        onMouseLeave={() => setHoveredAction(null)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
          'hover:bg-muted/50 hover:shadow-sm',
          isHovered && 'bg-muted/50'
        )}
      >
        {content}
      </button>
    );
  };

  return (
    <Card data-tooltip="quick-actions-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Section */}
        {createActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              Criar
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {createActions.map(renderAction)}
            </div>
          </div>
        )}

        {/* Manage Section */}
        {manageActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="h-3 w-3" />
              Gerenciar
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {manageActions.map(renderAction)}
            </div>
          </div>
        )}

        {/* View Section */}
        {viewActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3" />
              Visualizar
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {viewActions.map(renderAction)}
            </div>
          </div>
        )}

        {/* Recent Actions */}
        {displayedRecentActions.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Recentes
            </h4>
            <div className="space-y-1">
              {displayedRecentActions.map((action) => (
                action.href ? (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Clock className="h-3 w-3" />
                    <span className="flex-1 text-left truncate">{action.label}</span>
                    <span className="text-xs">{formatTimestamp(action.timestamp)}</span>
                  </Link>
                ) : (
                  <div
                    key={action.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground"
                  >
                    <Clock className="h-3 w-3" />
                    <span className="flex-1 text-left truncate">{action.label}</span>
                    <span className="text-xs">{formatTimestamp(action.timestamp)}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { QuickAction as QuickActionType, RecentAction as RecentActionType };