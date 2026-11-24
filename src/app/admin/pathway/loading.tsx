import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
