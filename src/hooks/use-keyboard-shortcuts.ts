/**
 * Keyboard Shortcuts Hook
 * 
 * Global keyboard shortcuts for navigation and actions.
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action?: () => void;
  href?: string;
  category: 'navigation' | 'actions' | 'help';
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  onNavigate?: (href: string) => void;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  onNavigate,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape and ? key even in inputs
      if (event.key !== 'Escape' && event.key !== '?') {
        return;
      }
    }

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        
        if (shortcut.action) {
          shortcut.action();
        } else if (shortcut.href) {
          if (onNavigate) {
            onNavigate(shortcut.href);
          } else {
            window.location.href = shortcut.href;
          }
        }
        break;
      }
    }
  }, [onNavigate]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { shortcuts };
}

// Default shortcuts for the operations dashboard
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: 'd', description: 'Dashboard', href: '/dashboard', category: 'navigation' },
  { key: 'o', description: 'Operacoes', href: '/operacoes', category: 'navigation' },
  { key: 'c', description: 'Campanhas', href: '/campanhas', category: 'navigation' },
  { key: 'g', description: 'Grupos', href: '/grupos', category: 'navigation' },
  { key: 'v', description: 'Eleitores', href: '/eleitores', category: 'navigation' },
  { key: 'n', description: 'Conversas', href: '/conversas', category: 'navigation' },
  { key: 'r', description: 'Relatorios', href: '/relatorios', category: 'navigation' },
  
  // Actions
  { key: 'k', ctrl: true, description: 'Buscar', category: 'actions' },
  { key: 'n', ctrl: true, description: 'Nova campanha', href: '/campanhas/nova', category: 'actions' },
  { key: 'r', ctrl: true, description: 'Atualizar pagina', category: 'actions' },
  
  // Help
  { key: '?', shift: true, description: 'Mostrar atalhos', category: 'help' },
  { key: 'Escape', description: 'Fechar modal/overlay', category: 'help' },
];

export type { KeyboardShortcut as KeyboardShortcutType };