import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <Skeleton className="h-8 w-80" />
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1.5 h-3 w-56" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
