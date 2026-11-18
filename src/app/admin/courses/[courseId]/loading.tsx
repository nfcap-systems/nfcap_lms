import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Skeleton className="h-64 w-full lg:w-72 lg:shrink-0" />
        <Skeleton className="h-64 flex-1" />
      </div>
    </div>
  );
}
