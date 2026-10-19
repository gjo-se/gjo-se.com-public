import { cva } from 'class-variance-authority';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';

const dividerVariants = cva('h-6 w-px shrink-0');

export interface FlowPlaybackControlsProps {
  /** Zero-based index of the currently active step. */
  activeStepIndex: number;
  /** Total number of steps in the active flow. */
  stepCount: number;
  /** Whether auto-play is currently running. */
  isPlaying: boolean;
  /** Whether the active flow has steps (stepCount > 0). */
  hasSteps: boolean;
  /** The label of the currently active step, if any. */
  activeStepLabel?: string;
  /** Start or restart auto-play. */
  onPlay: () => void;
  /** Pause auto-play. */
  onPause: () => void;
  /** Go to the previous step. */
  onPrev: () => void;
  /** Go to the next step. */
  onNext: () => void;
}

/**
 * Pure presentational component for flow playback controls.
 *
 * Renders prev/play-pause/next buttons, a step indicator, and the
 * active step label. No state, store, or context – all behaviour
 * is driven via props.
 */
export default function FlowPlaybackControls({
  activeStepIndex,
  stepCount,
  isPlaying,
  hasSteps,
  activeStepLabel,
  onPlay,
  onPause,
  onPrev,
  onNext,
}: FlowPlaybackControlsProps) {
  return (
    <>
      <div
        className={dividerVariants()}
        style={{ backgroundColor: 'var(--color-border, #d1d5db)' }}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={!hasSteps || activeStepIndex === 0}
        title="Vorheriger Step"
      >
        {'\u23EE'}
      </Button>

      {isPlaying ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onPause}
          disabled={!hasSteps}
          title="Pause"
        >
          {'\u23F8'}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onPlay}
          disabled={!hasSteps}
          title="Abspielen"
        >
          {'\u25B6'}
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasSteps || activeStepIndex >= stepCount - 1}
        title="Nächster Step"
      >
        {'\u23ED'}
      </Button>

      <div
        className={dividerVariants()}
        style={{ backgroundColor: 'var(--color-border, #d1d5db)' }}
      />

      {/* Step indicator */}
      <Text as="span" size="sm" color="muted">
        Step {hasSteps ? activeStepIndex + 1 : 0}/{stepCount}
      </Text>

      {/* Active step label */}
      {activeStepLabel && (
        <Text as="span" size="sm" weight="medium">
          {activeStepLabel}
        </Text>
      )}
    </>
  );
}
