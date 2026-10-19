import Icon from '@src/components/primitives/Icon/Icon';
import Text from '@src/components/primitives/Text/Text';
import { COLOR_TOKEN_CSS } from '@src/lib/colorTokens';

import { getStatusIcon } from './StatusBadge.logic';
import { SIZE_CONFIG } from './StatusBadge.utils';

import type { StatusBadgeProps } from './StatusBadge.interface';

/**
 * StatusBadge – Molecule displaying a status with icon, color, and optional category.
 *
 * Two variants:
 * - `dot`: compact – colored dot + status name (table cells).
 * - `badge`: expanded – icon + status name on colored background (detail views).
 *
 * @example
 * <StatusBadge statusName="pending" colorToken="amber" variant="badge" />
 * <StatusBadge statusName="approved" colorToken="green" variant="dot" />
 */
export default function StatusBadge({
  statusName,
  colorToken,
  category,
  variant = 'badge',
  size = 'md',
}: StatusBadgeProps) {
  const iconName = getStatusIcon(statusName);
  const colors = COLOR_TOKEN_CSS[colorToken];
  const sizeCfg = SIZE_CONFIG[size];
  const tooltip = category ? `${statusName} \u00B7 ${category}` : statusName;

  if (variant === 'dot') {
    return (
      <div className="inline-flex items-center gap-1.5" title={tooltip}>
        <div className={`inline-block ${sizeCfg.dot} rounded-full ${colors.dot}`} />
        <Text size={sizeCfg.text}>{statusName}</Text>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
      title={tooltip}
    >
      <Icon name={iconName} size={sizeCfg.icon} />
      <Text size={sizeCfg.text}>{statusName}</Text>
    </div>
  );
}

export type { StatusBadgeProps } from './StatusBadge.interface';
