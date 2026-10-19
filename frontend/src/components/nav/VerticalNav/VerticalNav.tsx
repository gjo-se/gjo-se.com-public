import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { useCallback, useState } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router';

import Icon from '@src/components/primitives/Icon/Icon';
import Sidebar, {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@src/components/primitives/Sidebar';
import { useAuth } from '@src/features/auth';
import { useJobRolePendingCount, useSkillPendingCount } from '@src/features/fbf';
import { useLLMCallLogsUnread } from '@src/features/llm';
import { useDarkMode } from '@src/hooks/useDarkMode';
import { route } from '@src/router.derived';

import { adminGroups, getBadgeCount, readAccordionState, writeAccordionState } from './VerticalNav.utils';

import type { NavBadgeCounts } from './VerticalNav.types';

/**
 * VerticalNav – Admin-Sidebar auf Basis von primitives/Sidebar.
 * Collapsible="icon" für Icon-Only-Modus.
 * Navi-Gruppen per Accordion ein-/ausklappbar.
 * Wird innerhalb eines SidebarProvider gerendert.
 */
export default function VerticalNav() {
  const { user, logout } = useAuth();
  const [isDark, toggleDark] = useDarkMode();
  const location = useLocation();
  const { unreadCount } = useLLMCallLogsUnread();
  const { pendingCount: skillPendingCount } = useSkillPendingCount();
  const { pendingCount: jobRolePendingCount } = useJobRolePendingCount();

  const badgeCounts: NavBadgeCounts = { unreadCount, skillPendingCount, jobRolePendingCount };

  const allGroupIds = adminGroups.map((g) => g.id);

  const [accordionValue, setAccordionValue] = useState<string[]>(() => {
    const stored = readAccordionState();
    // If nothing stored, default to all groups expanded.
    return stored.length > 0 ? stored : allGroupIds;
  });

  const handleAccordionValueChange = useCallback((value: string[]) => {
    setAccordionValue(value);
    writeAccordionState(value);
  }, []);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* ── Header: Brand ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<RouterNavLink to={route.adminDashboard.path} />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-lg font-bold">G</span>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">gjo-se.com</span>
                <span className="text-xs">Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content: Tools + Accordion Groups ── */}
      <SidebarContent>
        {/* Tools */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<RouterNavLink to={route.home.path} />}
              tooltip="Zur Website"
            >
              <Icon name="globe" />
              <span>Zur Website</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleDark} tooltip={isDark ? 'Light Mode' : 'Dark Mode'}>
              <Icon name={isDark ? 'sun' : 'moon'} />
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        {/* Accordion Groups */}
        <AccordionPrimitive.Root multiple value={accordionValue} onValueChange={handleAccordionValueChange} className="space-y-1 px-2">
          {adminGroups.map((group) => (
            <AccordionPrimitive.Item key={group.id} value={group.id}>
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
                  <Icon name={group.icon} size="sm" />
                  <span className="flex-1">{group.label}</span>
                  <span className="shrink-0 -rotate-90 transition-transform duration-200 group-data-[panel-open]:rotate-0">
                    <Icon name="chevron-down" size="sm" />
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Panel className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up">
                <div className="pl-4 group-data-[collapsible=icon]:pl-0">
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const itemPath = item.route.path;
                      const isActive = location.pathname === itemPath || location.pathname.startsWith(itemPath + '/');
                      const badgeCount = getBadgeCount(itemPath, badgeCounts);
                      const showBadge = badgeCount > 0;
                      const displayLabel = item.label ?? item.route.label;

                      return (
                        <SidebarMenuItem key={item.route.label}>
                          <SidebarMenuButton
                            render={<RouterNavLink to={itemPath} end />}
                            isActive={isActive}
                            tooltip={displayLabel}
                          >
                            <Icon name={item.icon} />
                            <span>{displayLabel}</span>
                            {showBadge && (
                              <span className="-ml-0.5 flex h-4 min-w-4 shrink-0 -translate-y-1 items-center justify-center rounded-full bg-destructive px-0.5 text-3xs font-bold leading-none text-destructive-foreground group-data-[collapsible=icon]:hidden">
                                {badgeCount}
                              </span>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              </AccordionPrimitive.Panel>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </SidebarContent>

      {/* ── Footer: Auth ── */}
      <SidebarFooter>
        <SidebarMenu>
          {user?.email && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={user.email}>
                <Icon name="contact" />
                <span className="truncate">{user.email}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => { void logout(); }}
              tooltip="Abmelden"
            >
              <Icon name="log-out" />
              <span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
