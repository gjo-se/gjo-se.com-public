import Icon from '@src/components/primitives/Icon/Icon';
import Text from '@src/components/primitives/Text/Text';
import { cn } from '@src/lib/utils';

import { navButtonVariants } from './NavButton.variants';

import type { NavButtonProps } from './NavButton.interface';

/**
 * NavButton – geschlossener Navigations-Button (Header-Muster).
 *
 * Kapselt die früher am Consumer frei gesetzten Menü-/Icon-/Chip-Styles als
 * `variant`/`tone`. Text-Labels der Varianten `menu`/`drawer` füllen den Button
 * (`flex-1`) und erben die Textfarbe; `chip` rendert ein schlichtes Inline-Label.
 */
export default function NavButton({
  variant = 'menu',
  tone = 'default',
  icon,
  iconStart,
  label,
  iconEnd,
  ...domProps
}: NavButtonProps) {
  const isTextLabel = variant === 'menu' || variant === 'drawer';
  const iconEndVariant = tone === 'primary' ? 'blue' : 'default';

  return (
    <button type="button" className={cn(navButtonVariants({ variant, tone }))} {...domProps}>
      {iconStart && <Icon name={iconStart} aria-hidden />}
      {icon && <Icon name={icon} aria-hidden />}
      {label != null &&
        (isTextLabel ? (
          <span className="flex-1 text-left">
            <Text as="span" color="inherit">
              {label}
            </Text>
          </span>
        ) : (
          label
        ))}
      {iconEnd && <Icon name={iconEnd} variant={iconEndVariant} aria-hidden />}
    </button>
  );
}
