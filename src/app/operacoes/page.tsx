'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChipHealthGrid } from '@/components/chip-health-grid';
import { CampaignProgressBars } from '@/components/campaign-progress-bars';
import { AlertsPanel, type AlertData } from '@/components/alerts-panel';
import { GroupCapacityGrid } from '@/components/group-capacity-grid';
import { ConversionKPIs } from '@/components/conversion-kpis';
import { MessageFeed } from '@/components/message-feed';
import {
  RefreshCw,
  Smartphone,
  Send,
  Users,
  MessageCircle,
  Activity,
} from 'lucide-react';

export default function OperacoesPage() {
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Fetch operations data
  const fetchOperations = useCallback(async () => {
    try {
      const [opsRes, kpisRes, msgsRes, groupsRes] = await Promise.all([
        fetch('/api/dashboard/operations'),
        fetch('/api/dashboard/kpis'),
        fetch('/api/dashboard/messages'),
        fetch('/api/dashboard/groups'),
      ]);
      
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
    } catch (error) {
      console.error('Failed to fetch operations data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchOperations, 10000);
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
        setTimeout(fetchOperations, 2000);
      }
    } catch (error) {
      console.error('Failed to restart chip:', error);
    }
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchOperations} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {opsData?.alerts && opsData.alerts.length > 0 && (
          <AlertsPanel alerts={opsData.alerts} />
        )}

        {/* Conversion KPIs */}
        {kpiData && (
          <Card>
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

        {/* Two columns: Chips + Campaigns | Groups + Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Chips + Campaigns */}
          <div className="space-y-6">
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

          {/* Right: Groups + Messages */}
          <div className="space-y-6">
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
                  loading={groupsData.length === 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Mensagens Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 px-4 pb-4">
                <MessageFeed messages={messagesData} loading={messagesData.length === 0} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}