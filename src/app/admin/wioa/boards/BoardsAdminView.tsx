'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Badge } from '@/components/admin-ui/badge';
import { Button } from '@/components/admin-ui/button';
import { Card, CardContent } from '@/components/admin-ui/card';
import { NewWorkforceBoardDialog } from '@/components/admin-shell/quick-create/NewWorkforceBoardDialog';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';

export function BoardsAdminView({ boards }: { boards: WorkforceBoardSummary[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add board
        </Button>
      </div>

      {boards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workforce boards yet — add one to start routing learners by ZIP.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Card
              key={b.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => router.push(`/admin/wioa/boards/${b.id}`)}
            >
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{b.name}</h3>
                  <Badge variant={b.active ? 'success' : 'outline'}>
                    {b.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{b.serviceArea}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {b.ajccCount} AJCC{b.ajccCount === 1 ? '' : 's'}
                  </span>
                  <span>
                    {b.jurisdictionCount} ZIP{b.jurisdictionCount === 1 ? '' : 's'}
                  </span>
                  <span>
                    {b.contactCount} contact{b.contactCount === 1 ? '' : 's'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewWorkforceBoardDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
