import { route } from '@src/router.derived';

import type { AdminGroup, NavBadgeCounts } from './VerticalNav.types';

/** localStorage key for persisting which accordion groups are open. */
const ACCORDION_STORAGE_KEY = 'admin_sidebar_accordion_state';

/** Maps a nav item path to its badge count (0 = no badge). */
export function getBadgeCount(path: string, counts: NavBadgeCounts): number {
  if (path === route.adminLlmCallLogs.path) return counts.unreadCount;
  if (path === route.adminFbfSkill.path) return counts.skillPendingCount;
  if (path === route.adminFbfJobRole.path) return counts.jobRolePendingCount;
  return 0;
}

/** Reads the persisted open-accordion group ids (empty list when unset/corrupt). */
export function readAccordionState(): string[] {
  try {
    const raw = localStorage.getItem(ACCORDION_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed as string[];
    }
  } catch { /* corrupted – fall through to default */ }
  return [];
}

/** Persists the open-accordion group ids. */
export function writeAccordionState(ids: string[]): void {
  try {
    localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(ids));
  } catch { /* quota exceeded – silently ignore */ }
}

/** Admin navigation groups rendered by the VerticalNav accordion. */
export const adminGroups: AdminGroup[] = [
  {
    id: 'overview',
    label: 'Übersicht',
    icon: 'layout-dashboard',
    items: [
      { route: route.adminDashboard, icon: 'layout-dashboard' },
    ],
  },
  {
    id: 'viscera',
    label: 'Viscera',
    icon: 'git-branch',
    items: [
      { route: route.adminVisceraViews, icon: 'git-fork', label: 'Diagrams' },
      { route: route.adminVisceraModel, icon: 'boxes', label: 'Model' },
      { route: route.adminVisceraEditor, icon: 'file-code', label: 'Editor' },
      { route: route.adminVisceraExplorer, icon: 'search', label: 'Explorer' },
      { route: route.adminVisceraAdrs, icon: 'scroll-text', label: 'ADRs' },
      { route: route.adminVisceraFlows, icon: 'workflow', label: 'Flows' },
    ],
  },
  {
    id: 'fbf',
    label: 'FBF',
    icon: 'brain',
    items: [
      { route: route.adminAiscopeProject, icon: 'target' },
      { route: route.adminFbfSkill, icon: 'zap' },
      { route: route.adminFbfSearchTerm, icon: 'search' },
      { route: route.adminFbfJobRole, icon: 'briefcase' },
      { route: route.adminSkillAnalysis, icon: 'bar-chart-3' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'file-text',
    items: [
      { route: route.adminSiteContent, icon: 'globe' },
      { route: route.adminContact, icon: 'mail' },
      { route: route.adminApplicationProfile, icon: 'contact' },
      { route: route.adminPortfolio, icon: 'briefcase' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'users',
    items: [
      { route: route.adminCrmCompanies, icon: 'building-2' },
      { route: route.adminCrmPersons, icon: 'contact' },
    ],
  },
  {
    id: 'application',
    label: 'Bewerbungen',
    icon: 'send',
    items: [{ route: route.adminApplicationSubmissions, icon: 'send' }],
  },
  {
    id: 'llm',
    label: 'LLM',
    icon: 'cpu',
    items: [
      { route: route.adminCredential, icon: 'key' },
      { route: route.adminLlmSettings, icon: 'sliders-horizontal' },
      { route: route.adminLlmTask, icon: 'list-todo' },
      { route: route.adminLlmCallLogs, icon: 'alert-triangle' },
      { route: route.adminObserver, icon: 'eye' },
    ],
  },
  {
    id: 'configuration',
    label: 'Konfiguration',
    icon: 'wrench',
    items: [
      { route: route.adminCoreTags, icon: 'tag' },
      { route: route.adminCoreStatus, icon: 'circle-dot' },
      { route: route.adminTechnologyCatalog, icon: 'cpu' },
      { route: route.adminSettingsCronJobs, icon: 'clock' },
      { route: route.adminServices, icon: 'server' },
      { route: route.adminNotification, icon: 'send' },
    ],
  },
];
