'use client';

import { useCallback, useRef, useState } from 'react';
import { Bold, Code2, Italic, Strikethrough, Variable, ChevronDown } from 'lucide-react';
import { SUPPORTED_CAMPAIGN_VARIABLES } from '@/lib/campaign-variables';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppFormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onTextChange: (newText: string) => void;
  currentText: string;
  className?: string;
}

// ─── Formatting definitions ───────────────────────────────────────────────────

type FormatDef = {
  marker: string;
  label: string;
  icon: React.ReactNode;
};

const FORMATS: FormatDef[] = [
  { marker: '*', label: 'Negrito', icon: <Bold className="h-3.5 w-3.5" /> },
  { marker: '_', label: 'Itálico', icon: <Italic className="h-3.5 w-3.5" /> },
  { marker: '~', label: 'Tachado', icon: <Strikethrough className="h-3.5 w-3.5" /> },
  { marker: '`', label: 'Monoespaçado', icon: <Code2 className="h-3.5 w-3.5" /> },
];

// ─── Hook: detect active format at cursor ────────────────────────────────────

function useActiveFormats(text: string, cursorPos: number): Set<string> {
  const active = new Set<string>();
  for (const { marker } of FORMATS) {
    // Find all pairs of this marker in the text
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`${escaped}([^${escaped}]+)${escaped}`, 'g');
    let match;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (cursorPos > start && cursorPos <= end) {
        active.add(marker);
        break;
      }
    }
  }
  return active;
}

// ─── WhatsAppFormatToolbar ────────────────────────────────────────────────────

export function WhatsAppFormatToolbar({
  textareaRef,
  onTextChange,
  currentText,
  className = '',
}: WhatsAppFormatToolbarProps) {
  const [cursorPos, setCursorPos] = useState(0);
  const [varMenuOpen, setVarMenuOpen] = useState(false);
  const varMenuRef = useRef<HTMLDivElement>(null);
  const activeFormats = useActiveFormats(currentText, cursorPos);

  const applyFormat = useCallback(
    (marker: string) => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = currentText.slice(start, end);

      let newText: string;
      let newCursorStart: number;
      let newCursorEnd: number;

      if (selected.length > 0) {
        // Wrap selection with marker
        newText =
          currentText.slice(0, start) +
          marker +
          selected +
          marker +
          currentText.slice(end);
        newCursorStart = start + marker.length;
        newCursorEnd = end + marker.length;
      } else {
        // Insert double markers at cursor, place cursor between them
        newText =
          currentText.slice(0, start) +
          marker +
          marker +
          currentText.slice(start);
        newCursorStart = start + marker.length;
        newCursorEnd = start + marker.length;
      }

      onTextChange(newText);
      setCursorPos(newCursorStart);

      // Restore focus and cursor after React re-render
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [currentText, onTextChange, textareaRef],
  );

  const insertVariable = useCallback(
    (variable: string) => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newText = currentText.slice(0, start) + variable + currentText.slice(end);
      onTextChange(newText);

      const newPos = start + variable.length;
      setCursorPos(newPos);
      setVarMenuOpen(false);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      });
    },
    [currentText, onTextChange, textareaRef],
  );

  const handleCursorChange = useCallback(() => {
    const el = textareaRef.current;
    if (el) setCursorPos(el.selectionStart);
  }, [textareaRef]);

  return (
    <div
      className={`relative flex h-9 items-center gap-0.5 rounded-t-lg border border-b-0 border-border bg-[#F8F6F1] px-2 ${className}`}
      onMouseDown={(e) => {
        // Prevent blur on textarea when clicking toolbar buttons
        e.preventDefault();
      }}
      onClick={handleCursorChange}
    >
      {/* Format buttons */}
      {FORMATS.map(({ marker, label, icon }) => (
        <button
          key={marker}
          type="button"
          title={label}
          onClick={() => applyFormat(marker)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-accent ${
            activeFormats.has(marker)
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={label}
        >
          {icon}
        </button>
      ))}

      {/* Visual separator */}
      <div className="mx-1 h-4 w-px bg-border" />

      {/* Variable dropdown trigger */}
      <div className="relative" ref={varMenuRef}>
        <button
          type="button"
          title="Inserir variável"
          onClick={() => setVarMenuOpen((prev) => !prev)}
          className="flex h-7 items-center gap-1 rounded px-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Inserir variável"
          aria-expanded={varMenuOpen}
        >
          <Variable className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Variável</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {/* Dropdown list */}
        {varMenuOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setVarMenuOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-md border border-border bg-background py-1 shadow-md">
              {SUPPORTED_CAMPAIGN_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <span className="font-mono text-primary">{v.key}</span>
                  <span className="ml-auto text-muted-foreground">{v.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WhatsAppFormatToolbar;
