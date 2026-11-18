'use client';

import { useState } from 'react';

import { Icon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/admin-ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/admin-ui/sidebar';

import { NewCourseDialog } from './NewCourseDialog';
import { NewWorkforceBoardDialog } from './NewWorkforceBoardDialog';

export function QuickCreateMenu() {
  const [courseOpen, setCourseOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip="Quick Create"
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
          >
            <Icon name="plus" className="size-4" />
            <span>Quick Create</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onSelect={() => setCourseOpen(true)}>
            <Icon name="layers" className="size-4" />
            New course
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setBoardOpen(true)}>
            <Icon name="map-pin" className="size-4" />
            New WIOA board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewCourseDialog open={courseOpen} onOpenChange={setCourseOpen} />
      <NewWorkforceBoardDialog open={boardOpen} onOpenChange={setBoardOpen} />
    </>
  );
}
