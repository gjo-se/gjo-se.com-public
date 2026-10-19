import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';

import { errorStateDescriptionVariants, errorStateVariants } from './ErrorState.variants';

export interface ErrorStateProps {
  /** Optionaler Fehlercode (z. B. „404"). Ohne Code wird nur Titel/Text gezeigt. */
  code?: string
  title: string
  description: string
  buttonLabel?: string
  onButtonClick?: () => void
}
/**
 * ErrorState – Einheitlicher Fehlerzustand für 404, 500, 403 etc.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <ErrorState code="404" title="Seite nicht gefunden" description="Die gesuchte Seite existiert nicht."
 *   buttonLabel="Zur Startseite" onButtonClick={() => navigate('/')} />
 */
export default function ErrorState({ code, title, description, buttonLabel, onButtonClick }: ErrorStateProps) {
  return (
    <div className={errorStateVariants()}>
      {code && <Text variant="h1">{code}</Text>}
      <Text variant="subtitle" weight="semibold">
        {title}
      </Text>
      <div className={errorStateDescriptionVariants()}>
        <Text color="muted">{description}</Text>
      </div>
      {buttonLabel && onButtonClick && (
        <Button variant="default" size="default" onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}

export type { ErrorStateVariants } from './ErrorState.variants';
