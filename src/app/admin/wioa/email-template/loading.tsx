import { Skeleton } from '@/components/admin-ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
