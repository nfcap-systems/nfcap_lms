import { requireAdmin } from '@/lib/actions/guard';
import { DataIoView } from './DataIoView';

export default async function AdminDataIoPage() {
  await requireAdmin();
  return <DataIoView />;
}
