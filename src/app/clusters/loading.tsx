import SidebarLayout from '@/components/SidebarLayout';
import { TablePageLoading } from '@/components/page-loading';

export default function Loading() {
  return (
    <SidebarLayout currentPage="clusters">
      <TablePageLoading title="Clusters" />
    </SidebarLayout>
  );
}
