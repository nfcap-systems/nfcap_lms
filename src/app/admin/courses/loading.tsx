import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-8 w-80" />
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
