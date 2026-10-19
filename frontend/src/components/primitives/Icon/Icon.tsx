import { cn } from '@src/lib/utils';

import { icons, isBrandIcon, brandIconComponents } from './Icon.registry';
import { iconVariants } from './Icon.variants';

import type { IconProps } from './Icon.interface';

/**
 * Icon – Restricted icon wrapper with Lucide + brand SVGs.
 */
export default function Icon({
  name, size = 'sm', variant = 'default', shrink = false, rotate = false, filled = false, href, external, label,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  onClick,
}: IconProps) {
  const svg = isBrandIcon(name) ? (() => {
    const BrandIcon = brandIconComponents[name];
    return (
      <BrandIcon
        className={cn(
          iconVariants({ size, variant }),
          shrink && 'shrink-0',
          rotate && 'rotate-180 transition-transform',
          filled && 'fill-current',
        )}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        onClick={onClick}
      />
    );
  })() : (() => {
    const LucideIcon = icons[name as keyof typeof icons];
    return (
      <LucideIcon
        className={cn(
          iconVariants({ size, variant }),
          shrink && 'shrink-0',
          rotate && 'rotate-180 transition-transform',
          filled && 'fill-current',
        )}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        onClick={onClick}
      />
    );
  })();

  const isExternal = external ?? (!!href && (href.startsWith('http://') || href.startsWith('https://')));

  if (href) {
    return (
      <a
        href={href}
        className={cn('inline-flex items-center gap-1.5 transition-colors', iconVariants({ size, variant }), 'hover:text-on-surface')}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        aria-label={ariaLabel ?? label}
        onClick={onClick}
      >
        {svg}
        {label && <span className="text-sm">{label}</span>}
      </a>
    );
  }

  return svg;
}
