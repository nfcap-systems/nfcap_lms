import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-96 flex-[1.3] rounded-lg" />
        <Skeleton className="h-96 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
