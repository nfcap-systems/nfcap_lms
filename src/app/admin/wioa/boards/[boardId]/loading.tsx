import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-6 w-56" />
        <Skeleton className="mt-1 h-4 w-40" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
