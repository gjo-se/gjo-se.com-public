import { cva } from 'class-variance-authority';

import Text from '@src/components/primitives/Text/Text';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
);

const iconVariants = cva('text-sm leading-none text-on-surface-secondary');

interface FreshnessBadgeProps {
  isOutdated: boolean;
  loading: boolean;
}

const TOOLTIP =
  'Source YAML modified after SVG generation. Run dev_restart to regenerate.';

/**
 * Badge that warns when a rendered SVG is older than its YAML source.
 *
 * - ``isOutdated === true``: amber badge with warning icon + tooltip
 * - ``isOutdated === false`` or ``loading``: renders nothing
 */
export default function FreshnessBadge({ isOutdated, loading }: FreshnessBadgeProps) {
  if (!isOutdated || loading) return null;

  return (
    <div
      className={badgeVariants()}
      title={TOOLTIP}
      role="status"
      aria-label="SVG outdated"
    >
      <div
        aria-hidden="true"
        className={iconVariants()}
      >
        {'\u26A0\uFE0F'}
      </div>
      <Text size="xs" weight="semibold">SVG outdated</Text>
    </div>
  );
}
