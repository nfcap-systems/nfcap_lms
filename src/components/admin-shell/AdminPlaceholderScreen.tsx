import { Badge } from '@/components/admin-ui/badge';
import { Card, CardContent } from '@/components/admin-ui/card';

export function AdminPlaceholderScreen({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-10">
        <Badge variant="outline">{phase}</Badge>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          This screen is a structural placeholder. It will be fully designed and built in its own
          phase.
        </p>
      </CardContent>
    </Card>
  );
}
