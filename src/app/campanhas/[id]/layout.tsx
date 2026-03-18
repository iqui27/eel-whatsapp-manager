'use client';
import SidebarLayout from '@/components/SidebarLayout';

export default function CampaignDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout currentPage="campanhas" pageTitle="Campanha">
      <div className="p-6">
        {children}
      </div>
    </SidebarLayout>
  );
}
