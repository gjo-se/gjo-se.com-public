import type { IconName } from '@src/components/primitives/Icon/Icon.registry';
import type { RouteTarget } from '@src/router.derived';

/** An admin navigation accordion group. */
export interface AdminGroup {
  id: string;
  label: string;
  icon: IconName;
  items: NavItem[];
}

/** Badge counts shown next to specific nav entries (0 = no badge). */
export interface NavBadgeCounts {
  unreadCount: number;
  skillPendingCount: number;
  jobRolePendingCount: number;
}

/** A single navigable entry inside an admin accordion group. */
export interface NavItem {
  route: RouteTarget;
  icon: IconName;
  /** Override label from route (e.g. "Viscera Views" → "Diagrams") */
  label?: string;
}
