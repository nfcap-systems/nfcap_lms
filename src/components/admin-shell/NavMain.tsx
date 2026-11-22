'use client';

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

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <QuickCreateMenu />
          </SidebarMenuItem>
          {items.map((entry) => {
            if (isNavGroup(entry)) {
              const groupActive = isNavGroupActive(pathname, entry);

              return (
                <Collapsible
                  key={entry.label}
                  defaultOpen={groupActive}
                  className="group/collapsible"
                >
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
              );
            }

            const active = isNavItemActive(pathname, entry.href);
            return (
              <SidebarMenuItem key={entry.href}>
                <SidebarMenuButton asChild isActive={active} tooltip={entry.label}>
                  <Link href={entry.href}>
                    <Icon name={entry.icon} className="size-4" />
                    <span>{entry.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
