import { useCallback, useEffect, useState } from 'react';

import StatusCycleBadge from '@src/components/primitives/StatusCycleBadge/StatusCycleBadge';
import { setCoreStatus, type CoreStatusOut } from '@src/lib/api/coreCatalog';
import type { ColorToken } from '@src/lib/colorTokens';
import { showErrorToast } from '@src/lib/errorToast';
import { fetchStatusesOnce, getCachedStatuses, hasCachedStatuses } from '@src/providers/statusCatalog/statusCache';

export interface StatusCellProps {
  statusableType: string;
  statusableId: number;
  /** Current status name from the API (e.g. "pending", "active"). */
  currentStatus: string | null | undefined;
  /** Current color token from the API (e.g. "amber", "green"). */
  currentColor: string | null | undefined;
}

/**
 * Generic status cell for any statusable entity.
 *
 * Fetches scoped statuses once per type (cached globally),
 * computes the click-to-cycle order, and handles optimistic updates.
 *
 * @example
 * // In any table column renderCell:
 * createElement(StatusCell, {
 *   statusableType: 'fbf_skill',
 *   statusableId: row.id,
 *   currentStatus: skill.status,
 *   currentColor: skill.status_color_token,
 * })
 */
export default function StatusCell({
  statusableType,
  statusableId,
  currentStatus: apiStatus,
  currentColor: apiColor,
}: StatusCellProps) {
  const [statuses, setStatuses] = useState<CoreStatusOut[]>(() => getCachedStatuses(statusableType) ?? []);
  const [override, setOverride] = useState<{ status: string; color_token: string } | null>(null);

  useEffect(() => {
    if (hasCachedStatuses(statusableType)) return;
    fetchStatusesOnce(statusableType).then(setStatuses);
  }, [statusableType]);

  const cycle: Record<string, { id: number; name: string; color_token: string } | null> = {};
  statuses.forEach((s, i) => {
    const next = statuses[(i + 1) % statuses.length];
    cycle[s.name] = { id: next.id, name: next.name, color_token: next.color_token };
  });

  // Resolve the current status: prefer the override, then the API status when
  // it is a known entry in the list. If the entity has no status yet (null) or
  // the API returns an unknown value, fall back to the first available status
  // so the cycle is always actionable instead of being stuck on a stale
  // default like 'pending'.
  const overrideStatus = override?.status ?? null;
  const knownApiStatus = apiStatus && cycle[apiStatus] !== undefined ? apiStatus : null;
  const currentStatus = overrideStatus ?? knownApiStatus ?? (statuses[0]?.name ?? 'pending');
  const currentColor = (
    override?.color_token
    ?? (knownApiStatus ? apiColor : statuses[0]?.color_token)
    ?? 'amber'
  ) as ColorToken;
  const next = cycle[currentStatus] ?? null;

  const handleCycle = useCallback(async () => {
    if (!next) return;
    const prev = override;
    setOverride({ status: next.name, color_token: next.color_token });
    try {
      await setCoreStatus(statusableType, statusableId, next.id);
    } catch {
      showErrorToast('Fehler beim Ändern des Status.');
      setOverride(prev);
    }
  }, [next, override, statusableType, statusableId]);

  return (
    <StatusCycleBadge
      currentName={currentStatus}
      currentColor={currentColor}
      nextName={next?.name ?? null}
      onCycle={handleCycle}
    />
  );
}
