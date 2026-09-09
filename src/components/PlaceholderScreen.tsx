import { Card, CardContent } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';

export type PlaceholderScreenProps = {
  title: string;
  description: string;
  phase: string;
};

export function PlaceholderScreen({ title, description, phase }: PlaceholderScreenProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-10">
        <Badge tone="info">{phase}</Badge>
        <h2 className="text-xl font-semibold text-brand-heading">{title}</h2>
        <p className="max-w-xl text-sm text-text-secondary">{description}</p>
        <p className="text-xs text-text-muted">
          This screen is a structural placeholder. It will be fully designed and built in its own
          phase.
        </p>
      </CardContent>
    </Card>
  );
}
