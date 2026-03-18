'use client';

import { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopbarDatePickerProps {
  /** Called whenever the user picks or clears a date */
  onDateChange?: (date: Date | null) => void;
}

function formatLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function TopbarDatePicker({ onDateChange }: TopbarDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [todayLabel, setTodayLabel] = useState('');

  // Compute today label client-side only (avoids SSR hydration mismatch)
  useEffect(() => {
    setTodayLabel(formatLabel(new Date()));
  }, []);

  const displayLabel = selected ? formatLabel(selected) : todayLabel;
  const isFiltered = !!selected;

  function handleSelect(day: Date | undefined) {
    setSelected(day);
    setOpen(false);
    // Emit custom event for pages that listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('topbar:datechange', {
          detail: { date: day ? day.toISOString().slice(0, 10) : null },
        }),
      );
    }
    onDateChange?.(day ?? null);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(undefined);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('topbar:datechange', { detail: { date: null } }),
      );
    }
    onDateChange?.(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'hidden xl:flex h-[42px] w-auto min-w-fit items-center gap-2 rounded-lg border px-3 text-sm shrink-0 transition-colors',
            isFiltered
              ? 'border-primary/40 bg-primary/5 text-primary'
              : 'border-border bg-transparent text-muted-foreground hover:bg-muted/50',
          )}
          title={isFiltered ? 'Filtro de data ativo — clique para alterar' : 'Filtrar por data'}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="capitalize whitespace-nowrap">{displayLabel}</span>
          {isFiltered && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
              title="Limpar filtro de data"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          initialFocus
          footer={
            selected ? (
              <div className="border-t border-border px-3 py-2">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleSelect(undefined)}
                >
                  Limpar seleção
                </button>
              </div>
            ) : null
          }
        />
      </PopoverContent>
    </Popover>
  );
}
