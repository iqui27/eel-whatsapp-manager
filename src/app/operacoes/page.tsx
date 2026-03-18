'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChipHealthGrid } from '@/components/chip-health-grid';
import { CampaignProgressBars } from '@/components/campaign-progress-bars';
import { AlertsPanel, type AlertData } from '@/components/alerts-panel';
import { GroupCapacityGrid } from '@/components/group-capacity-grid';
import { ConversionKPIs } from '@/components/conversion-kpis';
import { MessageFeed } from '@/components/message-feed';
import { SystemStatusCard, type SystemStatus } from '@/components/system-status-card';
import { NextActionsPanel } from '@/components/next-actions-panel';
import { QuickActionsPanel } from '@/components/quick-actions-panel';
import { HelpPanel } from '@/components/help-panel';
import { OnboardingTooltips, useOnboardingState } from '@/components/onboarding-tooltips';
import { KeyboardShortcutsOverlay } from '@/components/keyboard-shortcuts';
import { type SystemState } from '@/lib/action-suggestions';
import { getRecentNotifications, type StoredNotification } from '@/lib/notifications';
import {
  RefreshCw,
  Smartphone,
  Send,
  Users,
  MessageCircle,
  Activity,
  ArrowRightLeft,
  HelpCircle,
  Keyboard,
} from 'lucide-react';

export default function OperacoesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { shouldShowTour, resetOnboarding } = useOnboardingState();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Operations dashboard state
  const [opsData, setOpsData] = useState<{
    chips: Array<{
      id: string;
      name: string;
      phone: string;
      healthStatus: string;
      messagesSentToday: number;
      dailyLimit: number;
      lastWebhookEvent: Date | null;
      lastHealthCheck: Date | null;
      isFallbackFor?: string[];
    }>;
    campaigns: Array<{
      id: string;
      name: string;
      status: string;
      totalSent: number;
      totalDelivered: number;
      totalRead: number;
      totalFailed: number;
      queued: number;
    }>;
    alerts: AlertData[];
    failoverCount?: number;
  } | null>(null);
  
  const [kpiData, setKpiData] = useState<{
    totalSent: number;
    deliveredRate: number;
    readRate: number;
    replyRate: number;
    groupJoinRate: number;
    trends?: { delivered: number; read: number; reply: number; groupJoin: number };
  } | null>(null);
  
  const [messagesData, setMessagesData] = useState<Array<{
    id: string;
    direction: 'inbound' | 'outbound';
    chipName: string;
    leadName: string;
    leadPhone: string;
    preview: string;
    status: string;
    createdAt: Date;
  }>>([]);
  
  const [groupsData, setGroupsData] = useState<Array<{
    id: string;
    name: string;
    currentSize: number;
    maxSize: number;
    status: string;
    inviteUrl: string | null;
    chipInstanceName: string | null;
  }>>([]);

  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [voterTotal, setVoterTotal] = useState(0);

  // Fetch operations data
  const fetchOperations = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    
    try {
      const [opsRes, kpisRes, msgsRes, groupsRes, voterRes] = await Promise.all([
        fetch('/api/dashboard/operations'),
        fetch('/api/dashboard/kpis'),
        fetch('/api/dashboard/messages'),
        fetch('/api/dashboard/groups'),
        fetch('/api/voters?limit=1'),
      ]);
      
      if (!opsRes.ok && showRefreshing) toast.error('Erro ao carregar operacoes');
      if (!kpisRes.ok && showRefreshing) toast.error('Erro ao carregar KPIs');
      if (!msgsRes.ok && showRefreshing) toast.error('Erro ao carregar mensagens');
      if (!groupsRes.ok && showRefreshing) toast.error('Erro ao carregar grupos');

      if (opsRes.ok) {
        const data = await opsRes.json();
        setOpsData(data);
      }
      if (kpisRes.ok) {
        const data = await kpisRes.json();
        setKpiData(data);
      }
      if (msgsRes.ok) {
        const data = await msgsRes.json();
        setMessagesData(data.messages || []);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroupsData(data.groups || []);
      }
      if (voterRes.ok) {
        const voterData = await voterRes.json();
        setVoterTotal(typeof voterData?.total === 'number' ? voterData.total : 0);
      }
      
      // Fetch notifications
      setNotifications(getRecentNotifications(20));
    } catch (error) {
      console.error('Failed to fetch operations data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchOperations(), 10000);
    return () => clearInterval(interval);
  }, [fetchOperations]);

  // Handle chip restart
  const handleRestartChip = async (chipId: string) => {
    try {
      const res = await fetch(`/api/chips?action=restart&chipId=${chipId}`, {
        method: 'PUT',
      });
      if (res.ok) {
        // Refresh data after restart
        setTimeout(() => fetchOperations(), 2000);
      }
    } catch (error) {
      console.error('Failed to restart chip:', error);
    }
  };

  // Calculate system status for SystemStatusCard
  const systemStatus: SystemStatus = {
    chips: {
      total: opsData?.chips?.length || 0,
      healthy: opsData?.chips?.filter(c => c.healthStatus === 'healthy' || c.healthStatus === 'connected').length || 0,
      warning: opsData?.chips?.filter(c => c.healthStatus === 'warning' || c.healthStatus === 'stale').length || 0,
      error: opsData?.chips?.filter(c => c.healthStatus === 'error' || c.healthStatus === 'quarantined').length || 0,
      offline: opsData?.chips?.filter(c => c.healthStatus === 'offline' || c.healthStatus === 'disconnected').length || 0,
    },
    groups: {
      total: groupsData?.length || 0,
      active: groupsData?.filter(g => g.status === 'active').length || 0,
      nearCapacity: groupsData?.filter(g => {
        const percent = (g.currentSize / g.maxSize) * 100;
        return percent >= 80 && percent < 100;
      }).length || 0,
      full: groupsData?.filter(g => g.status === 'full' || g.currentSize >= g.maxSize).length || 0,
    },
    campaigns: {
      active: opsData?.campaigns?.filter(c => c.status === 'sending' || c.status === 'active').length || 0,
      scheduled: opsData?.campaigns?.filter(c => c.status === 'scheduled').length || 0,
      completed: opsData?.campaigns?.filter(c => c.status === 'sent' || c.status === 'completed').length || 0,
      failed: opsData?.campaigns?.filter(c => c.status === 'failed').length || 0,
    },
    lastUpdated: new Date(),
    isRefreshing,
  };

  // Calculate system state for NextActionsPanel
  const systemState: SystemState = {
    chips: {
      total: systemStatus.chips.total,
      healthy: systemStatus.chips.healthy,
      offline: systemStatus.chips.offline,
      error: systemStatus.chips.error,
    },
    groups: {
      total: systemStatus.groups.total,
      nearCapacity: systemStatus.groups.nearCapacity,
      full: systemStatus.groups.full,
      active: systemStatus.groups.active,
    },
    campaigns: {
      active: systemStatus.campaigns.active,
      scheduled: systemStatus.campaigns.scheduled,
      pending: 0,
      failed: systemStatus.campaigns.failed,
    },
    voters: {
      total: voterTotal,
    },
    queue: {
      pending: opsData?.campaigns?.reduce((sum, c) => sum + c.queued, 0) || 0,
      failed: opsData?.campaigns?.reduce((sum, c) => sum + c.totalFailed, 0) || 0,
    },
    failover: {
      recentCount: opsData?.failoverCount || 0,
    },
  };

  if (isLoading) {
    return (
      <SidebarLayout currentPage="operacoes" pageTitle="Operacoes">
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64 bg-muted rounded-xl" />
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="operacoes" pageTitle="Operacoes">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Operacoes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitoramento em tempo real das operacoes WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Onboarding Tour Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetOnboarding}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
              Tour
            </Button>
            {/* Keyboard Shortcuts Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowKeyboardShortcuts(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Keyboard className="h-4 w-4" />
              Atalhos
            </Button>
            {/* Failover indicator */}
            {opsData?.failoverCount && opsData.failoverCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-sm">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>{opsData.failoverCount} failover{opsData.failoverCount > 1 ? 's' : ''}</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchOperations(true)} 
              className="gap-1.5"
              data-tooltip="refresh-button"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {opsData?.alerts && opsData.alerts.length > 0 && (
          <div data-tooltip="alerts-panel">
            <AlertsPanel alerts={opsData.alerts} />
          </div>
        )}

        {/* Main Grid: Status + Actions | KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Status + Next Actions */}
          <div className="space-y-6">
            <div data-tooltip="kpis-section">
              <SystemStatusCard 
                status={systemStatus}
                onRefresh={() => fetchOperations(true)}
                onNavigateToChips={() => router.push('/chips')}
                onNavigateToGroups={() => router.push('/grupos')}
                onNavigateToCampaigns={() => router.push('/campanhas')}
              />
            </div>
            <NextActionsPanel systemState={systemState} />
          </div>

          {/* Middle Column: Quick Actions + Help */}
          <div className="space-y-6">
            <QuickActionsPanel />
            <HelpPanel />
          </div>

          {/* Right Column: Conversion KPIs */}
          <div data-tooltip="kpis-section">
            {kpiData && (
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    KPIs de Conversao
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversionKPIs data={kpiData} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Two columns: Chips + Campaigns | Groups + Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Chips + Campaigns */}
          <div className="space-y-6">
            <div data-tooltip="chips-section">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Chips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChipHealthGrid 
                    chips={opsData?.chips || []} 
                    loading={!opsData}
                    onRestart={handleRestartChip}
                  />
                </CardContent>
              </Card>
            </div>

            <div data-tooltip="campaigns-section">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Campanhas Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CampaignProgressBars campaigns={opsData?.campaigns || []} loading={!opsData} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: Groups + Messages */}
          <div className="space-y-6">
            <div data-tooltip="groups-section">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Grupos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GroupCapacityGrid 
                    groups={groupsData} 
                    loading={isLoading}
                  />
                </CardContent>
              </Card>
            </div>

            <div data-tooltip="messages-feed">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Mensagens Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 px-4 pb-4">
                  <MessageFeed messages={messagesData} loading={isLoading} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Onboarding Tooltips */}
        <OnboardingTooltips />

        {/* Keyboard Shortcuts Overlay */}
        <KeyboardShortcutsOverlay 
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      </div>
    </SidebarLayout>
  );
}