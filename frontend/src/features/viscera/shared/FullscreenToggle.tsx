import Button from '@src/components/primitives/Button/Button';
import Icon from '@src/components/primitives/Icon/Icon';

export interface FullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

/**
 * Toggles the architecture diagram fullscreen state via button.
 * Keyboard shortcut is handled by the central useShortcuts registry.
 */
export default function FullscreenToggle({ isFullscreen, onToggle }: FullscreenToggleProps) {
  const label = isFullscreen ? 'Vollbild beenden' : 'Vollbild öffnen';

  return (
    <Button
      aria-label={`${label} (Taste F)`}
      aria-pressed={isFullscreen}
      onClick={onToggle}
      title={`${label} (Taste F)`}
      variant="outline"
      size="icon-sm"
    >
      <Icon name={isFullscreen ? 'minimize-2' : 'maximize-2'} aria-hidden />
    </Button>
  );
}
