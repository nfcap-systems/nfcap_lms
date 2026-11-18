import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-44" />
          </div>
        ))}
      </div>
    </div>
  );
}
