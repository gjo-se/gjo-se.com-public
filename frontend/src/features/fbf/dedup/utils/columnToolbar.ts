/**
 * ColumnToolbar.logic – Shared status filter options for the board column toolbars.
 *
 * DB status names are the SSOT. Die Optionen spiegeln die tatsächlich in
 * ``core_status`` existierenden Kurations-Status von ``fbf_skill``
 * (pending / active / inactive / rejected / deprecated).
 * Der Leerwert ("" = all) leert den Status-Filter serverseitig.
 */

/** Status filter options for the board column toolbars (DB status names). */
export const STATUS_OPTIONS = [
  { value: '', label: 'all' },
  { value: 'pending', label: 'pending' },
  { value: 'active', label: 'active' },
  { value: 'inactive', label: 'inactive' },
  { value: 'rejected', label: 'rejected' },
  { value: 'deprecated', label: 'deprecated' },
] as const;
