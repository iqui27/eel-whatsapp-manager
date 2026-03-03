'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Layers,
  History,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

type PageId = 'dashboard' | 'chips' | 'contacts' | 'clusters' | 'history' | 'settings';

interface SidebarLayoutProps {
  children: ReactNode;
  currentPage: PageId;
  apiConnected?: boolean;
}

const navItems = [
  { id: 'dashboard' as PageId, label: 'Dashboard',    href: '/',          icon: LayoutDashboard },
  { id: 'chips'     as PageId, label: 'Chips',         href: '/chips',     icon: Smartphone },
  { id: 'contacts'  as PageId, label: 'Contatos',      href: '/contacts',  icon: Users },
  { id: 'clusters'  as PageId, label: 'Clusters',      href: '/clusters',  icon: Layers },
  { id: 'history'   as PageId, label: 'Histórico',     href: '/history',   icon: History },
  { id: 'settings'  as PageId, label: 'Configurações', href: '/settings',  icon: Settings },
];

export default function SidebarLayout({
  children,
  currentPage,
  apiConnected = false,
}: SidebarLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'relative flex h-full flex-col border-r border-border bg-sidebar transition-all duration-200 ease-in-out shrink-0',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-14 items-center border-b border-border px-4',
          collapsed && 'justify-center px-0',
        )}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-sm font-semibold text-sidebar-foreground">EEL</span>
                <span className="text-[10px] text-muted-foreground">WhatsApp Manager</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pt-3">
          {navItems.map(({ id, label, href, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <Link
                key={id}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive
                      ? 'text-sidebar-primary'
                      : 'text-muted-foreground group-hover:text-sidebar-foreground',
                  )}
                />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex flex-col gap-1 border-t border-border p-2 pb-3">
          {/* API status */}
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? (apiConnected ? 'API conectada' : 'API desconectada') : undefined}
          >
            {apiConnected ? (
              <Wifi className="h-4 w-4 shrink-0 text-[var(--success)]" />
            ) : (
              <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {!collapsed && (
              <span
                className={cn(
                  'text-xs',
                  apiConnected ? 'text-[var(--success)]' : 'text-muted-foreground',
                )}
              >
                {apiConnected ? 'API conectada' : 'API desconectada'}
              </span>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-[52px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-end border-b border-border bg-background px-6 gap-2 shrink-0">
          <ThemeToggle />
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
