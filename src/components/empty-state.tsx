import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// ── Inline SVG illustrations ──────────────────────────────────────────────────

function IllustrationSmartphone() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="6" width="36" height="52" rx="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.15"/>
      <rect x="14" y="6" width="36" height="52" rx="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="22" y1="48" x2="42" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <rect x="22" y="16" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="32" cy="52" r="2" fill="currentColor" opacity="0.4"/>
      <path d="M26 26 L30 30 L38 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  );
}

function IllustrationUsers() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="22" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M8 52c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="44" cy="24" r="7" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M52 52c0-7.18-5.82-13-13-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  );
}

function IllustrationLayers() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 10 L54 22 L32 34 L10 22 Z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
      <path d="M10 32 L32 44 L54 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M10 42 L32 54 L54 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
    </svg>
  );
}

function IllustrationHistory() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M32 18 L32 32 L42 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 22 Q8 32 12 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M10 22 L14 26 L10 22 L6 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  );
}

// ── EmptyState component ──────────────────────────────────────────────────────

type IllustrationId = 'smartphone' | 'users' | 'layers' | 'history';

const illustrations: Record<IllustrationId, React.FC> = {
  smartphone: IllustrationSmartphone,
  users: IllustrationUsers,
  layers: IllustrationLayers,
  history: IllustrationHistory,
};

export function EmptyState({
  illustration = 'smartphone',
  title,
  description,
  action,
  className,
}: {
  illustration?: IllustrationId;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const Illustration = illustrations[illustration];
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      <div className="text-muted-foreground/30">
        <Illustration />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
