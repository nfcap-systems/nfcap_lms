import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
