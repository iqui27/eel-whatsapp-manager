import SidebarLayout from '@/components/SidebarLayout';
import { DashboardLoading } from '@/components/page-loading';

export default function Loading() {
  return (
    <SidebarLayout currentPage="dashboard">
      <DashboardLoading />
    </SidebarLayout>
  );
}
