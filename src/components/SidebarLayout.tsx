'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Activity,
  Send,
  Target,
  MessageCircle,
  UserCheck,
  ShieldCheck,
  BarChart3,
  Lock,
  Smartphone,
  UsersRound,
  History,
  Settings,
  UserCircle,
  LogOut,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  ScrollText,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { CommandPalette } from './command-palette';
import { Topbar } from './topbar';
import { cn } from '@/lib/utils';
import { actorLabel, pagePermission, type SessionActor } from '@/lib/authorization';

// SWR fetcher — throws on non-2xx so SWR can retry/error properly
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  });

type PageId =
  | 'dashboard'
  | 'operacoes'
  | 'campanhas'
  | 'segmentacao'
  | 'conversas'
  | 'crm'
  | 'compliance'
  | 'relatorios'
  | 'admin'
  | 'chips'
  | 'grupos'
  | 'contacts'
  | 'clusters'
  | 'history'
  | 'settings'
  | 'configuracoes'
  | 'perfil'
  | 'wizard'
  | 'logs';

interface SidebarLayoutProps {
  children: ReactNode;
  currentPage: PageId;
  apiConnected?: boolean;
  pageTitle?: string;
}

interface ShellChipStatus {
  enabledCount: number;
  connectedCount: number;
  loading: boolean;
}

interface SessionResponse {
  actor: SessionActor & { label: string };
}

// Primary electoral navigation (8 items)
const electoralNavItems = [
  { id: 'dashboard'   as PageId, label: 'Dashboard',    href: '/',             icon: LayoutDashboard },
  { id: 'operacoes'   as PageId, label: 'Operações',    href: '/operacoes',    icon: Activity },
  { id: 'campanhas'   as PageId, label: 'Campanhas',    href: '/campanhas',    icon: Send },
  { id: 'segmentacao' as PageId, label: 'Segmentação',  href: '/segmentacao',  icon: Target },
  { id: 'conversas'   as PageId, label: 'Conversas',    href: '/conversas',    icon: MessageCircle },
  { id: 'crm'         as PageId, label: 'CRM',          href: '/crm',          icon: UserCheck },
  { id: 'compliance'  as PageId, label: 'Compliance',   href: '/compliance',   icon: ShieldCheck },
  { id: 'relatorios'  as PageId, label: 'Relatórios',   href: '/relatorios',   icon: BarChart3 },
];

// Legacy operational navigation
const legacyNavItems = [
  { id: 'wizard'   as PageId, label: 'Setup Wizard',   href: '/wizard',       icon: Zap },
  { id: 'admin'    as PageId, label: 'Admin',          href: '/admin',        icon: Lock },
  { id: 'chips'    as PageId, label: 'Chips',          href: '/chips',        icon: Smartphone },
  { id: 'grupos'   as PageId, label: 'Grupos',         href: '/grupos',       icon: UsersRound },
  { id: 'history'  as PageId, label: 'Histórico',       href: '/historico',    icon: History },
  { id: 'logs'     as PageId, label: 'Logs do Sistema', href: '/logs',         icon: ScrollText },
  { id: 'perfil'   as PageId, label: 'Meu Perfil',     href: '/perfil',       icon: UserCircle },
  { id: 'settings' as PageId, label: 'Configurações',  href: '/configuracoes', icon: Settings },
];

// Mobile bottom nav: 5 most important electoral items
const mobileNavItems = [
  electoralNavItems[0], // Dashboard
  electoralNavItems[2], // Campanhas
  electoralNavItems[4], // Conversas
  electoralNavItems[5], // CRM
  electoralNavItems[7], // Relatorios
];

// ─── Sidebar content (shared between desktop + mobile) ────────────────────
function SidebarContent({
  collapsed,
  currentPage,
  apiConnected,
  chipConnectivityLabel,
  primaryNavItems,
  secondaryNavItems,
  onLogout,
  onLinkClick,
}: {
  collapsed: boolean;
  currentPage: PageId;
  apiConnected: boolean;
  chipConnectivityLabel: string;
  primaryNavItems: typeof electoralNavItems;
  secondaryNavItems: typeof legacyNavItems;
  onLogout: () => void;
  onLinkClick?: () => void;
}) {
  const renderNavItem = (items: typeof electoralNavItems) =>
    items.map(({ id, label, href, icon: Icon }) => {
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
    });

  return (
    <>
      {/* Logo / Brand */}
      <div className={cn(
        'flex h-14 items-center border-b border-sidebar-border px-4 shrink-0',
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
                <span className="text-sm font-semibold text-sidebar-foreground">EEL Eleicao</span>
                <span className="text-[10px] text-muted-foreground">Operacao WhatsApp</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pt-3">
        {/* Primary electoral nav */}
        {renderNavItem(primaryNavItems)}

        {/* Separator + legacy section */}
        {secondaryNavItems.length > 0 && (
          <>
            <div className={cn('mt-3 mb-1', collapsed && 'hidden')}>
              <div className="mx-2.5 border-t border-sidebar-border" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="legacy-section-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="px-2.5 pb-1"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Operacional
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <div className={cn(collapsed && 'mt-3')}>
          {secondaryNavItems.map(({ id, label, href, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <Link
                key={id}
                href={href}
                onClick={onLinkClick}
                title={collapsed ? label : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0 py-2',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-sidebar-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  className={cn(
                    'h-[16px] w-[16px] shrink-0 transition-colors',
                    isActive
                      ? 'text-sidebar-primary'
                      : 'text-muted-foreground group-hover:text-sidebar-foreground',
                  )}
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key={`legacy-label-${id}`}
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
        </div>
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-sidebar-border p-2 pb-3 shrink-0">
        {/* Chip connectivity */}
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? chipConnectivityLabel : undefined}
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
                {chipConnectivityLabel}
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

// ─── Bottom nav (mobile) — 5 electoral items ─────────────────────────────
function BottomNav({
  currentPage,
  items,
}: {
  currentPage: PageId;
  items: typeof mobileNavItems;
}) {
  return (
    <nav className="flex h-16 items-center justify-around border-t border-border bg-sidebar px-2 md:hidden shrink-0">
      {items.map(({ id, label, href, icon: Icon }) => {
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
  const [sidebarRestored, setSidebarRestored] = useState(false);

  // Restore persisted state after mount (avoids SSR/client hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
    setSidebarRestored(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // ─── Session ──────────────────────────────────────────────────────────────
  const { data: sessionData, isLoading: sessionLoading } = useSWR<SessionResponse>(
    '/api/auth/session',
    fetcher,
    {
      dedupingInterval: 60000,      // Don't re-fetch within 60 seconds
      revalidateOnFocus: false,     // Don't re-fetch on tab focus
      revalidateOnReconnect: true,  // Do re-fetch when network reconnects
      errorRetryCount: 2,
      keepPreviousData: true,
    },
  );
  const sessionActor = sessionData?.actor ?? null;

  // ─── Chip status ──────────────────────────────────────────────────────────
  interface ChipFromAPI {
    enabled?: boolean;
    status?: string;
  }

  const { data: chipsData, isLoading: chipsLoading } = useSWR<ChipFromAPI[]>(
    '/api/chips',
    fetcher,
    {
      dedupingInterval: 30000,      // Chip status can change more frequently
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      keepPreviousData: true,
    },
  );

  const chipStatus = useMemo<ShellChipStatus>(() => {
    if (chipsLoading || !chipsData) {
      return { enabledCount: 0, connectedCount: 0, loading: chipsLoading };
    }
    const enabledChips = chipsData.filter((c) => c.enabled !== false);
    const connectedChips = enabledChips.filter((c) => c.status === 'connected');
    return {
      enabledCount: enabledChips.length,
      connectedCount: connectedChips.length,
      loading: false,
    };
  }, [chipsData, chipsLoading]);

  const allNavItems = [...electoralNavItems, ...legacyNavItems];
  const currentItem = allNavItems.find((n) => n.id === currentPage);
  const title = pageTitle ?? currentItem?.label ?? 'EEL Eleicao';
  const effectiveApiConnected = apiConnected || chipStatus.connectedCount > 0;
  const disconnectedCount = Math.max(chipStatus.enabledCount - chipStatus.connectedCount, 0);
  const topbarAlertTone: 'warning' | 'success' | 'neutral' = chipStatus.loading
    ? 'neutral'
    : chipStatus.enabledCount === 0
      ? 'neutral'
      : disconnectedCount > 0
        ? 'warning'
        : 'success';
  const topbarAlertLabel = chipStatus.loading
    ? 'Carregando status operacional'
    : chipStatus.enabledCount === 0
      ? 'Configure chips para iniciar a operação'
      : disconnectedCount > 0
        ? `${disconnectedCount} chip${disconnectedCount > 1 ? 's' : ''} desconectado${disconnectedCount > 1 ? 's' : ''}`
        : 'Operação estável';
  const chipConnectivityLabel = chipStatus.loading
    ? 'Carregando chips'
    : chipStatus.enabledCount === 0
      ? 'Nenhum chip habilitado'
      : `${chipStatus.connectedCount}/${chipStatus.enabledCount} chips conectados`;
  const allowedPrimaryNavItems = sessionActor
    ? electoralNavItems.filter((item) => {
        const permission = pagePermission(item.id);
        return !permission || sessionActor.permissions.includes(permission);
      })
    : electoralNavItems;
  const allowedSecondaryNavItems = sessionActor
    ? legacyNavItems.filter((item) => {
        const permission = pagePermission(item.id);
        return !permission || sessionActor.permissions.includes(permission);
      })
    : legacyNavItems;
  const allowedMobileNavItems = sessionActor
    ? mobileNavItems.filter((item) => {
        const permission = pagePermission(item.id);
        return !permission || sessionActor.permissions.includes(permission);
      })
    : mobileNavItems;
  const currentPagePermission = pagePermission(currentPage);
  const currentPageAllowed = currentPagePermission
    ? (sessionActor ? sessionActor.permissions.includes(currentPagePermission) : sessionLoading)
    : true;

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: sidebarRestored ? 0.2 : 0, ease: 'easeInOut' }}
        className="relative hidden h-full shrink-0 overflow-visible md:flex"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
          <SidebarContent
            collapsed={collapsed}
            currentPage={currentPage}
            apiConnected={effectiveApiConnected}
            chipConnectivityLabel={chipConnectivityLabel}
            primaryNavItems={allowedPrimaryNavItems}
            secondaryNavItems={allowedSecondaryNavItems}
            onLogout={handleLogout}
          />
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute right-0 top-6 z-20 flex h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-background/95 text-muted-foreground shadow-md backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
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
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar md:hidden"
            >
              <SidebarContent
                collapsed={false}
                currentPage={currentPage}
                apiConnected={effectiveApiConnected}
                chipConnectivityLabel={chipConnectivityLabel}
                primaryNavItems={allowedPrimaryNavItems}
                secondaryNavItems={allowedSecondaryNavItems}
                onLogout={handleLogout}
                onLinkClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Desktop Topbar — real shell contract only */}
        <header className="hidden md:block shrink-0">
          <Topbar
            pageTitle={title}
            periodLabel="Período definido por página"
            alertLabel={topbarAlertLabel}
            alertTone={topbarAlertTone}
            sessionLabel={actorLabel(sessionActor)}
          />
        </header>

        {/* Mobile header — simplified: hamburger + title + theme toggle */}
        <header className="flex h-14 items-center border-b border-border bg-background px-4 gap-3 shrink-0 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Page content — desktop full scroll, mobile with bottom nav */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-card">
          {currentPageAllowed ? (
            children
          ) : (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
                <h2 className="text-lg font-semibold text-foreground">Acesso restrito</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Seu operador não possui permissão para acessar esta área.
                </p>
                {sessionActor?.regionScope && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Escopo atual: {sessionActor.regionScope}
                  </p>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav currentPage={currentPage} items={allowedMobileNavItems} />
      </div>

      {/* Command palette (global, portal) */}
      <CommandPalette />
    </div>
  );
}
