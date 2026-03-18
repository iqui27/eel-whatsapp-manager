'use client';
import SidebarLayout from '@/components/SidebarLayout';

export default function GruposLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout currentPage="grupos" pageTitle="Grupos WhatsApp">
      <div className="p-6">
        {children}
      </div>
    </SidebarLayout>
  );
}
