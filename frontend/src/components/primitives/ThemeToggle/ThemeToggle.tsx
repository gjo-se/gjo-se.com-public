import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';

import type { ThemeToggleProps } from './ThemeToggle.interface';

/**
 * ThemeToggle – Button to toggle between dark and light mode.
 */
export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-label={isDark ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
    >
      {isDark ? <Icon name="sun" aria-hidden /> : <Icon name="moon" aria-hidden />}
    </Button>
  );
}
