'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { CommandPalette, CommandTrigger } from './command-palette';
import { cn } from '@/lib/utils';

type PageId = 'dashboard' | 'chips' | 'contacts' | 'clusters' | 'history' | 'settings';

interface SidebarLayoutProps {
  children: ReactNode;
  currentPage: PageId;
  apiConnected?: boolean;
  pageTitle?: string;
}

const navItems = [
  { id: 'dashboard' as PageId, label: 'Dashboard',    href: '/',          icon: LayoutDashboard },
  { id: 'chips'     as PageId, label: 'Chips',         href: '/chips',     icon: Smartphone },
  { id: 'contacts'  as PageId, label: 'Contatos',      href: '/contacts',  icon: Users },
  { id: 'clusters'  as PageId, label: 'Clusters',      href: '/clusters',  icon: Layers },
  { id: 'history'   as PageId, label: 'Histórico',     href: '/history',   icon: History },
  { id: 'settings'  as PageId, label: 'Configurações', href: '/settings',  icon: Settings },
];

// ─── Sidebar content (shared between desktop + mobile) ────────────────────
function SidebarContent({
  collapsed,
  currentPage,
  apiConnected,
  onLogout,
  onLinkClick,
}: {
  collapsed: boolean;
  currentPage: PageId;
  apiConnected: boolean;
  onLogout: () => void;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className={cn(
        'flex h-14 items-center border-b border-border px-4 shrink-0',
        collapsed && 'justify-center px-0',
      )}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="logo-text"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="flex flex-col leading-none gap-0.5 overflow-hidden whitespace-nowrap"
              >
                <span className="text-sm font-semibold text-sidebar-foreground">EEL</span>
                <span className="text-[10px] text-muted-foreground">WhatsApp Manager</span>
              </motion.div>
            )}
          </AnimatePresence>
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
              onClick={onLinkClick}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              {/* Active left-bar indicator */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-sidebar-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive
                    ? 'text-sidebar-primary'
                    : 'text-muted-foreground group-hover:text-sidebar-foreground',
                )}
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key={`label-${id}`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.12, ease: 'easeInOut' }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-border p-2 pb-3 shrink-0">
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
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="api-status"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  'text-xs overflow-hidden whitespace-nowrap',
                  apiConnected ? 'text-[var(--success)]' : 'text-muted-foreground',
                )}
              >
                {apiConnected ? 'API conectada' : 'API desconectada'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="logout-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.12 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}

// ─── Bottom nav (mobile) ──────────────────────────────────────────────────
function BottomNav({ currentPage }: { currentPage: PageId }) {
  // Show only 5 most important items on mobile
  const mobileItems = navItems.slice(0, 5);
  return (
    <nav className="flex h-16 items-center justify-around border-t border-border bg-sidebar px-2 md:hidden shrink-0">
      {mobileItems.map(({ id, label, href, icon: Icon }) => {
        const isActive = currentPage === id;
        return (
          <Link
            key={id}
            href={href}
            className="flex flex-col items-center gap-1 px-3 py-1 relative"
          >
            <motion.div
              animate={{ scale: isActive ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                isActive ? 'bg-primary/15' : 'bg-transparent',
              )}
            >
              <Icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} />
            </motion.div>
            <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {label}
            </span>
            {/* Active dot indicator */}
            {isActive && (
              <motion.div
                layoutId="bottom-nav-dot"
                className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────
export default function SidebarLayout({
  children,
  currentPage,
  apiConnected = false,
  pageTitle,
}: SidebarLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const currentItem = navItems.find((n) => n.id === currentPage);
  const title = pageTitle ?? currentItem?.label ?? 'EEL';

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative hidden md:flex h-full flex-col border-r border-border bg-sidebar overflow-hidden shrink-0"
      >
        <SidebarContent
          collapsed={collapsed}
          currentPage={currentPage}
          apiConnected={apiConnected}
          onLogout={handleLogout}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-[52px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>

      {/* ── Mobile Drawer overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar md:hidden"
            >
              <SidebarContent
                collapsed={false}
                currentPage={currentPage}
                apiConnected={apiConnected}
                onLogout={handleLogout}
                onLinkClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="flex h-14 items-center border-b border-border bg-background px-4 md:px-6 gap-3 shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate md:hidden">{title}</h1>
          </div>

          {/* Command palette trigger (desktop) */}
          <div className="hidden md:flex flex-1 items-center px-2">
            <CommandTrigger />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content — desktop full scroll, mobile with bottom nav */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav currentPage={currentPage} />
      </div>

      {/* Command palette (global, portal) */}
      <CommandPalette />
    </div>
  );
}
