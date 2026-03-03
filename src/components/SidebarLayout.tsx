'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
  currentPage: 'dashboard' | 'chips' | 'contacts' | 'clusters' | 'history' | 'settings';
}

const navItems = [
  { id: 'dashboard' as const, name: 'Dashboard',     href: '/',         icon: '📊' },
  { id: 'chips'     as const, name: 'Chips',          href: '/chips',    icon: '📱' },
  { id: 'contacts'  as const, name: 'Contatos',       href: '/contacts', icon: '👥' },
  { id: 'clusters'  as const, name: 'Clusters',       href: '/clusters', icon: '🧩' },
  { id: 'history'   as const, name: 'Histórico',      href: '/history',  icon: '📜' },
  { id: 'settings'  as const, name: 'Configurações',  href: '/settings', icon: '⚙️' },
];

export default function SidebarLayout({ children, currentPage }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-[260px] h-screen bg-[#0b1220] p-5 flex flex-col shrink-0">
        <div className="h-[60px] flex flex-col gap-1 shrink-0 mb-5">
          <div className="text-[24px] text-white font-sans font-bold">EEL</div>
          <div className="text-[11px] text-[#71717a]">WhatsApp Manager</div>
        </div>
        
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex rounded-md py-2.5 px-3 gap-3 ${
                currentPage === item.id
                  ? 'bg-[#3b82f6]'
                  : ''
              }`}
            >
              <span className="text-[16px]">{item.icon}</span>
              <span className={`text-[14px] ${
                currentPage === item.id
                  ? 'text-white' 
                  : 'text-[#a1a1aa]'
              }`}>
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center rounded-md py-3 px-2 gap-2 bg-[#166534]">
            <div className="rounded-full bg-[#22c55e] w-2 h-2" />
            <span className="text-[12px] text-white">API Conectada</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center rounded-md py-2.5 px-3 gap-2 bg-transparent border-none cursor-pointer hover:bg-[#1e293b] transition-colors"
          >
            <span className="text-[14px]">🚪</span>
            <span className="text-[13px] text-[#a1a1aa]">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[#f8fafc] p-7">
        {children}
      </main>
    </div>
  );
}
