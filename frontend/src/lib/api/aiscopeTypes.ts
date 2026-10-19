/** A single column in the project comparison table (one project). */
export interface ComparisonColumn {
  /** Internal project ID. */
  id: number
  /** Whether this is the master (canonical) project. */
  canonical: boolean
  /** Display label for the Score row ("Kanonisch" or e.g. "85 %"). */
  scoreLabel: string
  /** Whether to render a Chip instead of plain text for the score. */
  scoreChip: boolean
  title: string
  /** Curated mail title (role source for the application mail; null = fallback). */
  titleNormalized: string | null
  city: string | null
  country: string | null
  duration: string
  start: string
  remote: string
  /** Whether remote_percent is below 80 – shown in red. */
  remoteWarn: boolean
  jobRole: string
  contractType: string
  /** Whether contract_type is employee_leasing or permanent_position – shown in red. */
  contractWarn: boolean
  postedAt: string
  /** Whether posted_at is older than 30 days – shown in red. */
  postedAtWarn: boolean
  /** Freelancermap ID for the link icon row (null if no raw-data link should be shown). */
  freelancermapId: number | null
  /** URL to the freelancermap detail page. */
  freelancermapUrl: string | null
  /** Company name (from project.company_name). */
  agency: string
  /** Contact person name (from project.contact_name). */
  contactName: string
  /** Project description (Markdown). */
  description: string | null
  /** Linked canonical skills (only populated for the master column). */
  skills: SkillBadgeItem[]
  /** Last merge call-log ID (from project API, survives page refresh). */
  callLogId: number | null
  /** Endkunde-Status: 'Endkunde', 'Vermittler', oder '–'. */
  endcustomer: string
  /** Industry classification from freelancermap (e.g. IT, Finanzen). */
  industry: string | null
  /** Estimated offer hourly rate (EUR/h, upper bound; null = not estimated). */
  hourlyRate: number | null
  /** Own (manually curated) hourly rate (EUR/h; null = not set). */
  myHourlyRate: number | null
  /** Manual start override (`MM/YYYY`/`DD.MM.YYYY`/ignore token; null = no override). */
  myStartDate: string | null
}

/** Shared AIScope project status type (mirror of backend SSOT). */
export type ProjectStatus = 'new' | 'favorite' | 'applied' | 'archived';

/** A single skill badge item (shared between SkillBadges UI and comparison columns). */
export interface SkillBadgeItem {
  id: number
  name: string
  effective_importance: number | null
  level: number | null
  /** Public-facing knowledge level (0–5); null = unknown. */
  level_public?: number | null
  status?: string | null
}
