/**
 * Action Suggestions Library
 * 
 * Analyzes system state and suggests prioritized actions for operators.
 */

export interface ActionSuggestion {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string | ((state: SystemState) => string);
  action: string;
  href?: string;
  icon: 'alert-triangle' | 'smartphone' | 'users' | 'send' | 'database' | 'refresh-cw';
  condition: (state: SystemState) => boolean;
}

export interface SystemState {
  chips: {
    total: number;
    healthy: number;
    offline: number;
    error: number;
  };
  groups: {
    total: number;
    nearCapacity: number;
    full: number;
    active: number;
  };
  campaigns: {
    active: number;
    scheduled: number;
    pending: number;
    failed: number;
  };
  voters: {
    total: number;
  };
  queue: {
    pending: number;
    failed: number;
  };
  failover: {
    recentCount: number;
  };
}

// Action suggestions ordered by priority
const ACTION_SUGGESTIONS: ActionSuggestion[] = [
  {
    id: 'no-chips',
    priority: 'critical',
    title: 'Configurar Chips',
    description: 'Nenhum chip cadastrado. Adicione chips para comecar a enviar mensagens.',
    action: 'Adicionar Chip',
    href: '/chips',
    icon: 'smartphone',
    condition: (state: SystemState) => state.chips.total === 0,
  },
  {
    id: 'all-chips-offline',
    priority: 'critical',
    title: 'Todos os Chips Offline',
    description: 'Todos os chips estao desconectados. Verifique a conexao com a Evolution API.',
    action: 'Verificar Chips',
    href: '/chips',
    icon: 'alert-triangle',
    condition: (state: SystemState) => state.chips.total > 0 && state.chips.healthy === 0,
  },
  {
    id: 'chips-offline',
    priority: 'high',
    title: 'Reconectar Chips',
    description: (state: SystemState) => `${state.chips.offline} chip(s) offline. Reconecte para retomar operacoes.`,
    action: 'Ver Chips',
    href: '/chips',
    icon: 'smartphone',
    condition: (state: SystemState) => state.chips.offline > 0,
  },
  {
    id: 'chips-error',
    priority: 'high',
    title: 'Chips com Erro',
    description: (state: SystemState) => `${state.chips.error} chip(s) com erro. Investigue e corrija os problemas.`,
    action: 'Investigar',
    href: '/chips',
    icon: 'alert-triangle',
    condition: (state: SystemState) => state.chips.error > 0,
  },
  {
    id: 'no-groups',
    priority: 'high',
    title: 'Criar Grupos',
    description: 'Nenhum grupo criado. Crie grupos para seus segmentos.',
    action: 'Criar Grupo',
    href: '/grupos',
    icon: 'users',
    condition: (state: SystemState) => state.groups.total === 0 && state.chips.healthy > 0,
  },
  {
    id: 'groups-near-capacity',
    priority: 'medium',
    title: 'Grupos Proximos da Capacidade',
    description: (state: SystemState) => `${state.groups.nearCapacity} grupo(s) proximos da capacidade. Considere criar grupos overflow.`,
    action: 'Ver Grupos',
    href: '/grupos',
    icon: 'users',
    condition: (state: SystemState) => state.groups.nearCapacity > 0,
  },
  {
    id: 'no-voters',
    priority: 'medium',
    title: 'Importar Eleitores',
    description: 'Nenhum eleitor cadastrado. Importe sua base de contatos.',
    action: 'Importar',
    href: '/importar',
    icon: 'database',
    condition: (state: SystemState) => state.voters.total === 0,
  },
  {
    id: 'queue-failed',
    priority: 'high',
    title: 'Mensagens Falharam',
    description: (state: SystemState) => `${state.queue.failed} mensagem(s) falharam. Revise e tente novamente.`,
    action: 'Ver Fila',
    href: '/monitor',
    icon: 'alert-triangle',
    condition: (state: SystemState) => state.queue.failed > 0,
  },
  {
    id: 'recent-failover',
    priority: 'medium',
    title: 'Failover Recente',
    description: (state: SystemState) => `${state.failover.recentCount} failover(s) recente(s). Verifique se os chips principais estao estaveis.`,
    action: 'Ver Chips',
    href: '/chips',
    icon: 'refresh-cw',
    condition: (state: SystemState) => state.failover.recentCount > 0,
  },
  {
    id: 'campaigns-scheduled',
    priority: 'low',
    title: 'Campanhas Agendadas',
    description: (state: SystemState) => `${state.campaigns.scheduled} campanha(s) agendada(s). Verifique o agendamento.`,
    action: 'Ver Campanhas',
    href: '/campanhas',
    icon: 'send',
    condition: (state: SystemState) => state.campaigns.scheduled > 0,
  },
  {
    id: 'create-campaign',
    priority: 'low',
    title: 'Criar Campanha',
    description: 'Tudo pronto! Crie uma nova campanha para comecar a enviar mensagens.',
    action: 'Nova Campanha',
    href: '/campanhas/nova',
    icon: 'send',
    condition: (state: SystemState) => 
      state.chips.healthy > 0 && 
      state.groups.active > 0 && 
      state.voters.total > 0 &&
      state.campaigns.active === 0,
  },
  {
    id: 'all-good',
    priority: 'low',
    title: 'Sistema Operacional',
    description: 'Todos os sistemas funcionando normalmente. Continue monitorando.',
    action: 'Ver Dashboard',
    href: '/operacoes',
    icon: 'send',
    condition: (state: SystemState) => 
      state.chips.healthy > 0 && 
      state.chips.offline === 0 &&
      state.chips.error === 0 &&
      state.groups.nearCapacity === 0 &&
      state.queue.failed === 0,
  },
];

/**
 * Get the description text for a suggestion, resolving functions if needed.
 */
function resolveDescription(suggestion: ActionSuggestion, state: SystemState): string {
  return typeof suggestion.description === 'function' 
    ? suggestion.description(state) 
    : suggestion.description;
}

/**
 * Get prioritized action suggestions based on system state.
 */
export function getActionSuggestions(state: SystemState): Array<ActionSuggestion & { resolvedDescription: string }> {
  const applicable = ACTION_SUGGESTIONS.filter((suggestion) => 
    suggestion.condition(state)
  );

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = applicable.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Resolve descriptions
  return sorted.map(suggestion => ({
    ...suggestion,
    resolvedDescription: resolveDescription(suggestion, state),
  }));
}

/**
 * Get the most important action (first critical or high priority).
 */
export function getTopPriorityAction(state: SystemState): (ActionSuggestion & { resolvedDescription: string }) | null {
  const suggestions = getActionSuggestions(state);
  const criticalOrHigh = suggestions.filter(
    (s) => s.priority === 'critical' || s.priority === 'high'
  );
  return criticalOrHigh[0] || suggestions[0] || null;
}

/**
 * Get action count by priority.
 */
export function getActionCounts(state: SystemState): {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
} {
  const suggestions = getActionSuggestions(state);
  return {
    critical: suggestions.filter((s) => s.priority === 'critical').length,
    high: suggestions.filter((s) => s.priority === 'high').length,
    medium: suggestions.filter((s) => s.priority === 'medium').length,
    low: suggestions.filter((s) => s.priority === 'low').length,
    total: suggestions.length,
  };
}

// Re-export types
export type { ActionSuggestion as ActionSuggestionType, SystemState as SystemStateData };