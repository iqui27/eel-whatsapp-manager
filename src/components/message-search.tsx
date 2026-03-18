'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Clock,
  CheckCircle,
  Loader2,
  Phone,
  User,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  chipId: string | null;
  chipName: string | null;
  voterId: string | null;
  voterName: string | null;
  voterPhone: string;
  message: string;
  resolvedMessage: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  highlightedContent?: string;
}

interface MessageSearchProps {
  onResultClick?: (result: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700',
  assigned: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  read: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
  retry: 'bg-orange-100 text-orange-700',
};

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Render text with highlighted portions
function HighlightedText({ text }: { text: string }) {
  // Split by ** markers (used for highlighting)
  const parts = text.split(/\*\*(.*?)\*\*/g);
  
  return (
    <span>
      {parts.map((part, i) => 
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function MessageSearch({
  onResultClick,
  placeholder = 'Buscar mensagens...',
  autoFocus = false,
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'phone' | 'name' | 'message'>('all');

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);

    try {
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      params.set('limit', '20');
      if (searchType !== 'all') {
        params.set('type', searchType);
      }

      const res = await fetch(`/api/messages/search?${params.toString()}`);
      
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchType, performSearch]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    }
    setShowResults(false);
    setQuery('');
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-lg">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search type pills */}
      <div className="flex gap-2 mt-2">
        {[
          { value: 'all', label: 'Todos', icon: Search },
          { value: 'phone', label: 'Telefone', icon: Phone },
          { value: 'name', label: 'Nome', icon: User },
          { value: 'message', label: 'Mensagem', icon: MessageSquare },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSearchType(value as typeof searchType)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              searchType === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-card shadow-lg max-h-[400px] overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {query.length < 2 
                    ? 'Digite pelo menos 2 caracteres'
                    : 'Nenhum resultado encontrado'
                  }
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((result) => (
                  <li key={result.id}>
                    <button
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Phone and name */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs">
                              {formatPhone(result.voterPhone)}
                            </span>
                            {result.voterName && (
                              <span className="text-xs text-muted-foreground">
                                • {result.voterName}
                              </span>
                            )}
                          </div>
                          
                          {/* Highlighted content */}
                          <p className="text-sm line-clamp-2">
                            {result.highlightedContent ? (
                              <HighlightedText text={result.highlightedContent} />
                            ) : (
                              result.resolvedMessage
                            )}
                          </p>

                          {/* Campaign and chip */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {result.campaignName && (
                              <span className="bg-muted rounded px-1.5 py-0.5">
                                {result.campaignName}
                              </span>
                            )}
                            {result.chipName && (
                              <span>via {result.chipName}</span>
                            )}
                          </div>
                        </div>

                        {/* Status and date */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-medium',
                            STATUS_COLORS[result.status] ?? 'bg-gray-100 text-gray-700'
                          )}>
                            {result.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(result.sentAt || result.createdAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}