'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Keyboard, 
  X, 
  ArrowRight,
  Home,
  Send,
  Users,
  FileText,
  BarChart3,
  Search,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useKeyboardShortcuts, 
  DEFAULT_SHORTCUTS,
  type KeyboardShortcut,
} from '@/hooks/use-keyboard-shortcuts';

const categoryIcons = {
  navigation: Home,
  actions: Send,
  help: HelpCircle,
};

const categoryLabels = {
  navigation: 'Navegacao',
  actions: 'Acoes',
  help: 'Ajuda',
};

interface KeyboardShortcutsOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  shortcuts?: KeyboardShortcut[];
}

export function KeyboardShortcutsOverlay({
  isOpen: externalIsOpen,
  onClose,
  shortcuts = DEFAULT_SHORTCUTS,
}: KeyboardShortcutsOverlayProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen ?? internalIsOpen;

  const handleClose = useCallback(() => {
    setInternalIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Register the ? shortcut to toggle the overlay
  useKeyboardShortcuts({
    shortcuts: [
      ...shortcuts.filter((s) => s.key !== '?'),
      {
        key: '?',
        shift: true,
        description: 'Mostrar atalhos',
        action: () => setInternalIsOpen((prev) => !prev),
        category: 'help',
      },
    ],
    enabled: !isOpen,
  });

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatKey = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Cmd');
    
    // Format the key
    let key = shortcut.key;
    if (key === 'Escape') key = 'Esc';
    if (key === 'ArrowUp') key = 'Seta cima';
    if (key === 'ArrowDown') key = 'Seta baixo';
    if (key === 'ArrowLeft') key = 'Seta esquerda';
    if (key === 'ArrowRight') key = 'Seta direita';
    
    parts.push(key.toUpperCase());
    return parts.join(' + ');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'w-full max-w-lg bg-background rounded-xl shadow-2xl border overflow-hidden pointer-events-auto',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Atalhos de Teclado</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Shortcuts Grid */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons] || HelpCircle;
              
              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {categoryLabels[category as keyof typeof categoryLabels] || category}
                  </h3>
                  <div className="grid gap-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={`${shortcut.key}-${index}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {formatKey(shortcut).split(' + ').map((part, i, arr) => (
                            <span key={i} className="flex items-center gap-1">
                              <kbd className="h-6 min-w-6 px-1.5 flex items-center justify-center rounded border bg-muted text-xs font-medium text-muted-foreground">
                                {part}
                              </kbd>
                              {i < arr.length - 1 && (
                                <span className="text-xs text-muted-foreground">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">
              Pressione <kbd className="h-5 px-1.5 mx-1 inline-flex items-center justify-center rounded border bg-background text-xs font-medium">?</kbd> a qualquer momento para ver esta ajuda
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Small trigger button component
export function KeyboardShortcutsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Keyboard className="h-4 w-4" />
        <span className="hidden sm:inline">Atalhos</span>
      </Button>
      <KeyboardShortcutsOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export type { KeyboardShortcut };