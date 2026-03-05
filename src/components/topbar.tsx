'use client';

import { useState } from 'react';
import { Search, Calendar, ChevronDown, AlertTriangle } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

interface TopbarProps {
  alertCount?: number;
  alertText?: string;
  userRole?: string;
  userInitials?: string;
  periodLabel?: string;
}

export function Topbar({
  alertCount = 2,
  alertText = 'alertas de bloqueio',
  userRole = 'Coord. Sul',
  userInitials = 'CS',
  periodLabel = 'ultimos 7 dias',
}: TopbarProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="flex h-[74px] items-center gap-4 border-b border-border bg-background px-6">

      {/* Section 1 — Global Search */}
      <div className="flex flex-1 items-center max-w-[420px]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar campanha, eleitor ou tag..."
            className={cn(
              'w-full h-[42px] rounded-lg bg-muted/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground',
              'border-none outline-none transition-shadow',
              'focus:ring-1 focus:ring-ring',
            )}
          />
        </div>
      </div>

      {/* Section 2 — Period Selector */}
      <button
        type="button"
        className="flex w-[180px] h-[42px] items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm text-foreground transition-colors hover:bg-muted/50 shrink-0"
      >
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate text-muted-foreground">
          Periodo: {periodLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {/* Section 3 — Critical Alerts */}
      <button
        type="button"
        className="flex w-[220px] h-[42px] items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 text-sm font-medium text-warning transition-colors hover:bg-warning/15 shrink-0"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {alertCount} {alertText}
        </span>
      </button>

      {/* Section 4 — User Profile */}
      <div className="flex w-[120px] items-center gap-2 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <span className="text-xs font-semibold">{userInitials}</span>
        </div>
        <span className="text-sm font-medium text-foreground truncate">{userRole}</span>
      </div>

      {/* Section 5 — Theme Toggle */}
      <div className="shrink-0">
        <ThemeToggle />
      </div>

    </div>
  );
}
