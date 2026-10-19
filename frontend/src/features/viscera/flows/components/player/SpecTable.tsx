import { cva } from 'class-variance-authority';
import { useEffect } from 'react';

import Chip from '@src/components/primitives/Chip/Chip';
import Text from '@src/components/primitives/Text';
import { TableRoot, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@src/components/table';

import type { Flow, StepType } from '../../../core/workspaceSchema';

const TYPE_VARIANT: Record<StepType, 'info' | 'success' | 'warning'> = {
  message: 'info',
  process: 'success',
  decision: 'warning',
};

const TYPE_LABEL: Record<StepType, string> = {
  message: 'Message',
  process: 'Process',
  decision: 'Decision',
};

const DASH = '\u2013';
const headerLabelVariants = cva('tracking-wider');
const activeMarkerVariants = cva('mr-1.5 inline-block w-3 text-accent font-bold');
const ACTIVE_CELL_STYLE = {
  backgroundColor: 'color-mix(in oklab, var(--accent) 10%, transparent)',
};
const ACTIVE_FIRST_CELL_STYLE = {
  ...ACTIVE_CELL_STYLE,
  borderLeft: '2px solid var(--accent)',
};

export interface SpecTableProps {
  /** The flow whose steps to render in the spec table. */
  flow: Flow;
  /** Zero-based index of the currently active step (from useFlow). */
  activeStepIndex: number;
}

/** Given/When/Then matrix for the active flow – highlights and auto-scrolls the active step. */
export default function SpecTable({ flow, activeStepIndex }: SpecTableProps) {
  const { steps } = flow;

  useEffect(() => {
    const activeRow = document.querySelector<HTMLTableRowElement>('[data-active="true"]');
    activeRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeStepIndex]);

  return (
    <section>
      <header className="rounded-t-xl border-x border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
        <div className={headerLabelVariants()}>
          <Text size="xs" weight="semibold" color="muted" uppercase>
            Flow Spec – Given / When / Then
          </Text>
        </div>
      </header>

      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Step#</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Given</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Then</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const hasSpec = !!step.spec;
            const cellStyle = isActive ? ACTIVE_CELL_STYLE : undefined;

            return (
              <TableRow key={step.id} data-active={isActive ? 'true' : undefined}>
                <TableCell style={isActive ? ACTIVE_FIRST_CELL_STYLE : undefined}>
                  {isActive && (
                    <div className={activeMarkerVariants()}>
                      <Text color="inherit">▶</Text>
                    </div>
                  )}
                  {index + 1}
                </TableCell>
                <TableCell style={cellStyle}>
                  <Chip variant={TYPE_VARIANT[step.type]} size="sm">
                    {TYPE_LABEL[step.type]}
                  </Chip>
                </TableCell>
                <TableCell style={cellStyle}>{step.from || DASH}</TableCell>
                <TableCell style={cellStyle}>{step.to || DASH}</TableCell>
                <TableCell style={cellStyle}>
                  <Text color={hasSpec ? 'default' : 'muted'}>{step.spec?.given || DASH}</Text>
                </TableCell>
                <TableCell style={cellStyle}>
                  <Text color={hasSpec ? 'default' : 'muted'}>{step.spec?.when || DASH}</Text>
                </TableCell>
                <TableCell style={cellStyle}>
                  <Text color={hasSpec ? 'default' : 'muted'}>{step.spec?.then || DASH}</Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableRoot>
    </section>
  );
}
