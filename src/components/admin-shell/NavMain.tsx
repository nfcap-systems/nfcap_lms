'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/icons';
import { isNavGroup, isNavGroupActive, isNavItemActive } from '@/lib/nav';
import type { NavEntry } from '@/lib/nav';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/admin-ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/admin-ui/sidebar';

import { QuickCreateMenu } from './quick-create/QuickCreateMenu';

export function NavMain({ items }: { items: NavEntry[] }) {
  const pathname = usePathname();

  // Precomputed (not mutated during render) — true for an entry whose section header hasn't
  // been shown yet by an earlier entry in the list.
  const showSectionLabels: boolean[] = [];
  {
    let lastSection: string | undefined;
    for (const entry of items) {
      showSectionLabels.push(entry.section !== undefined && entry.section !== lastSection);
      lastSection = entry.section ?? lastSection;
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <QuickCreateMenu />
              {/* Sidebar.dc.html draws this next to Quick Create on every role — no Inbox route
                  exists yet (Messaging is backend-only, Layer 1), so disabled rather than
                  fabricated, same pattern as the Dashboard's "Add Learner" button. */}
              <SidebarMenuButton
                className="w-8 shrink-0 justify-center px-0"
                disabled
                tooltip="Inbox — not yet built"
                aria-label="Inbox"
              >
                <Icon name="message-circle" className="size-4" />
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
          {items.map((entry, index) => {
            const showSectionLabel = showSectionLabels[index];

            const sectionLabel = showSectionLabel ? (
              <SidebarMenuItem key={`section-${entry.section}`} className="list-none">
                <SidebarGroupLabel className="pointer-events-none mt-2 first:mt-0">
                  {entry.section}
                </SidebarGroupLabel>
              </SidebarMenuItem>
            ) : null;

            if (isNavGroup(entry)) {
              const groupActive = isNavGroupActive(pathname, entry);

              return (
                <Fragment key={entry.label}>
                  {sectionLabel}
                  <Collapsible defaultOpen={groupActive} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={groupActive} tooltip={entry.label}>
                          <Icon name={entry.icon} className="size-4" />
                          <span>{entry.label}</span>
                          <Icon
                            name="chevron-right"
                            className="ml-auto size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {entry.children.map((child) => {
                            const active = isNavItemActive(pathname, child.href);
                            return (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton asChild isActive={active}>
                                  <Link href={child.href}>
                                    <Icon name={child.icon} className="size-4" />
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </Fragment>
              );
            }

            const active = isNavItemActive(pathname, entry.href);
            return (
              <Fragment key={entry.href}>
                {sectionLabel}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={active} tooltip={entry.label}>
                    <Link href={entry.href}>
                      <Icon name={entry.icon} className="size-4" />
                      <span>{entry.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Fragment>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
