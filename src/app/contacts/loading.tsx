import SidebarLayout from '@/components/SidebarLayout';
import { TablePageLoading } from '@/components/page-loading';

export default function Loading() {
  return (
    <SidebarLayout currentPage="contacts">
      <TablePageLoading title="Contatos" />
    </SidebarLayout>
  );
}
