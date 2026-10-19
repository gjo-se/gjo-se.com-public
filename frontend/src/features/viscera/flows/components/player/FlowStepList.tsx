import { cva } from 'class-variance-authority';

import Text from '@src/components/primitives/Text/Text';

import type { FlowStep, StepType } from '../../../core/workspaceSchema';

const iconCellVariants = cva('w-5 text-center');
const labelVariants = cva('min-w-0 flex-1 truncate');

// ── Step type icon mapping ──────────────────────────────────────────────────

const STEP_TYPE_ICON: Record<StepType, string> = {
  message: '\uD83D\uDCAC',   // 💬
  process: '\u2699\uFE0F',   // ⚙️
  decision: '\u25C7',        // ◇
};

const DASH = '\u2013';

// ── Props ───────────────────────────────────────────────────────────────────

export interface FlowStepListProps {
  /** All steps of the currently selected flow. */
  steps: FlowStep[];
  /** Zero-based index of the currently active step (for highlight). */
  activeStepIndex: number;
  /** Optional: called when a step is clicked, with its index. */
  onSelectStep?: (index: number) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * FlowStepList – renders all steps of a flow as a compact list.
 *
 * Each row shows the step type icon, label, and `from \u2192 to` edge.
 * The active step row is highlighted with a background color.
 * Clicking a step optionally calls `onSelectStep` for direct navigation.
 */
export default function FlowStepList({
  steps,
  activeStepIndex,
  onSelectStep,
}: FlowStepListProps) {
  if (steps.length === 0) {
    return (
      <section>
        <Text as="span" size="xs" color="muted">
          Keine Steps definiert
        </Text>
      </section>
    );
  }

  return (
    <section
      role="list"
      className="divide-y divide-gray-100 dark:divide-gray-800"
    >
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex;

        return (
          <section
            key={step.id}
            role="listitem"
            tabIndex={onSelectStep ? 0 : undefined}
            aria-current={isActive ? 'step' : undefined}
            onClick={() => onSelectStep?.(index)}
            onKeyDown={(e) => {
              if (onSelectStep && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelectStep(index);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${
              isActive
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            } ${onSelectStep ? 'cursor-pointer' : ''}`}
          >
            {/* Step type icon */}
            <div className={iconCellVariants()}>
              <Text as="span" size="xs">
                {STEP_TYPE_ICON[step.type]}
              </Text>
            </div>

            {/* Index + label */}
            <div className={labelVariants()}>
              <Text as="span" size="xs" weight="medium">
                <Text as="span" size="xs" color="muted">
                  {index + 1}.
                </Text>{' '}
                {step.label || `Step ${index + 1}`}
              </Text>
            </div>

            {/* from → to */}
            {(step.from || step.to) && (
              <div className="shrink-0">
                <Text as="span" size="xs" color="muted">
                  {step.from || DASH} {'\u2192'} {step.to || DASH}
                </Text>
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
