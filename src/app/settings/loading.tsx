import SidebarLayout from '@/components/SidebarLayout';
import { SettingsLoading } from '@/components/page-loading';

export default function Loading() {
  return (
    <SidebarLayout currentPage="settings">
      <SettingsLoading />
    </SidebarLayout>
  );
}
