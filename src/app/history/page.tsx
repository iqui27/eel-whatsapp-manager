'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';

interface LogEntry {
  id: string;
  timestamp: string;
  chipName: string;
  phone: string;
  status: 'success' | 'error';
  message: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('7days');
  const [chipFilter, setChipFilter] = useState('all');
  const [chips, setChips] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchChips();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error('Falha ao carregar histórico');
      }
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const fetchChips = async () => {
    try {
      const res = await fetch('/api/chips');
      if (res.ok) {
        const data = await res.json();
        setChips(data.map((c: { name: string }) => c.name));
      }
    } catch {
      // non-critical — filter just won't be populated
    }
  };

  const formatDate = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hoje, ${timeStr}` : date.toLocaleDateString('pt-BR') + ', ' + timeStr;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesChip = chipFilter === 'all' || log.chipName === chipFilter;
    const now = Date.now();
    const logTime = new Date(log.timestamp).getTime();
    let matchesDate = true;
    if (dateFilter === '7days') matchesDate = now - logTime <= 7 * 24 * 60 * 60 * 1000;
    if (dateFilter === '24h') matchesDate = now - logTime <= 24 * 60 * 60 * 1000;
    if (dateFilter === '30days') matchesDate = now - logTime <= 30 * 24 * 60 * 60 * 1000;
    return matchesChip && matchesDate;
  });

  if (loading) {
    return (
      <SidebarLayout currentPage="history">
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="history">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-[24px] text-[#18181B] font-sans">Histórico de Aquecimento</h1>
          <p className="text-[14px] mt-1 text-[#71717A]">Acompanhe o log de mensagens enviadas</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3">
            <span className="text-[#ef4444] text-[14px]">⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-[#ef4444] text-[18px] border-none bg-transparent cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex h-10 items-center rounded-lg py-2 px-3 gap-2 bg-white border border-solid border-[#E4E4E7]">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border-none outline-none text-[14px] text-[#71717A] bg-transparent"
            >
              <option value="24h">Últimas 24 horas</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="all">Todos</option>
            </select>
            <span className="text-[10px] text-[#71717A]">▼</span>
          </div>
          <div className="flex h-10 items-center rounded-lg py-2 px-3 gap-2 bg-white border border-solid border-[#E4E4E7]">
            <select
              value={chipFilter}
              onChange={(e) => setChipFilter(e.target.value)}
              className="border-none outline-none text-[14px] text-[#71717A] bg-transparent"
            >
              <option value="all">Todos os chips</option>
              {chips.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <span className="text-[10px] text-[#71717A]">▼</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-clip bg-white border border-solid border-[#E4E4E7]">
          <div className="flex h-12 items-center px-4 bg-[#F4F4F5]">
            <div className="text-[13px] w-40 inline-block text-[#52525B] font-sans shrink-0">Data/Hora</div>
            <div className="text-[13px] w-[200px] inline-block text-[#52525B] font-sans shrink-0">Chip</div>
            <div className="text-[13px] w-[150px] inline-block text-[#52525B] font-sans shrink-0">Telefone</div>
            <div className="text-[13px] w-[120px] inline-block text-[#52525B] font-sans shrink-0">Status</div>
            <div className="text-[13px] grow shrink basis-0 inline-block text-[#52525B] font-sans">Mensagem/Erro</div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-[#71717A]">
              Nenhum registro encontrado
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={log.id}
                className={`flex h-14 items-center px-4 ${
                  index < filteredLogs.length - 1 ? 'border-b border-b-[#F4F4F5]' : ''
                }`}
              >
                <div className="text-[14px] w-40 inline-block text-[#18181B] shrink-0">
                  {formatDate(log.timestamp)}
                </div>
                <div className="text-[14px] w-[200px] inline-block text-[#18181B] shrink-0">
                  {log.chipName}
                </div>
                <div className="text-[14px] w-[150px] inline-block text-[#71717A] shrink-0">
                  {log.phone}
                </div>
                <div className="flex w-[120px] items-center gap-1.5 shrink-0">
                  <div
                    className={`rounded-full w-2 h-2 shrink-0 ${
                      log.status === 'success' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                    }`}
                  />
                  <span
                    className={`text-[13px] ${
                      log.status === 'success' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}
                  >
                    {log.status === 'success' ? 'Sucesso' : 'Falha'}
                  </span>
                </div>
                <div
                  className={`text-[14px] grow shrink basis-0 inline-block ${
                    log.status === 'success' ? 'text-[#71717A]' : 'text-[#EF4444]'
                  }`}
                >
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
