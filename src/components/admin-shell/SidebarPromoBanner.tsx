import Link from 'next/link';
import { Icon, type IconName } from '@/components/icons';

/** Sidebar.dc.html's role-specific callout above the account menu — a generic presentational
 * shell. What it shows is a decision made where the shell is composed (admin/layout.tsx picks a
 * real, role-relevant count), not hardcoded here, so a future Coordinator/Partner shell could use
 * the same component with its own count instead of a second bespoke implementation. Hidden when
 * the sidebar is collapsed to icons, same as NavUser's name/email. */
export function SidebarPromoBanner({
  icon,
  title,
  description,
  href,
}: {
  icon: IconName;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group-data-[collapsible=icon]:hidden flex flex-col gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon name={icon} className="size-4" />
        {title}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
