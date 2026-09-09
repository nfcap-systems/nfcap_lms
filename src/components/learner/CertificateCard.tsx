'use client';

import { useState } from 'react';
import { Badge, Button, Card, CardContent, Drawer } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { Credential } from '@/lib/data/credentials';
import { CertificateDocument } from './CertificateDocument';

export function CertificateCard({
  credential,
  learnerName,
}: {
  credential: Credential;
  learnerName: string;
}) {
  const [open, setOpen] = useState(false);
  const { course, evidence } = credential;
  const issuedDate = new Date(evidence.statusUpdatedAt ?? evidence.submittedAt).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <>
      <Card className="flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <Badge tone="neutral">{course.category}</Badge>
            <Badge tone="success">
              <Icon name="award" className="size-3" />
              Earned
            </Badge>
          </div>
          <div>
            <h3 className="text-base font-semibold text-brand-heading">{course.title}</h3>
            <p className="mt-1 text-xs text-text-muted">Issued {issuedDate}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-auto w-full"
            onClick={() => setOpen(true)}
          >
            View Certificate
          </Button>
        </CardContent>
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Certificate"
        panelClassName="max-w-xl"
      >
        <CertificateDocument credential={credential} learnerName={learnerName} />
      </Drawer>
    </>
  );
}
