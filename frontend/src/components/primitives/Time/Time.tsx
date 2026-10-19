import type { TimeProps } from './Time.interface';

/**
 * Time – Semantic HTML time element for machine-readable dates and durations.
 */
export default function Time({ dateTime, children, ...domProps }: TimeProps) {
  return (
    <time dateTime={dateTime} {...domProps}>
      {children}
    </time>
  );
}
