import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';

import FlowStepList from './FlowStepList';

import type { Flow } from '../../../core/workspaceSchema';

const sectionLabelVariants = cva('px-3 py-1.5 tracking-wider');

export interface FlowDropdownProps {
  /** All available flows from the workspace. */
  flows: Flow[];
  /** The currently selected flow, or null. */
  activeFlow: Flow | null;
  /** Select a flow by ID. Pass null to deselect. */
  onSelectFlow: (id: string | null) => void;
  /** Jump to a specific step index. */
  goToStep: (index: number) => void;
  /** Zero-based index of the currently active step. */
  activeStepIndex: number;
  /** Find flows that reference the given flow as a parent. */
  getParentFlows: (flowId: string) => Flow[];
  /** Find subflows for the given flow. */
  getSubFlows: (flowId: string) => Flow[];
}

/**
 * FlowDropdown – self-contained flow selector dropdown with keyboard
 * navigation, parent/subflow links, and step preview.
 *
 * Extracted from FlowPlayer as a standalone component encapsulating
 * all dropdown state and behavior.
 */
export default function FlowDropdown({
  flows,
  activeFlow,
  onSelectFlow,
  goToStep,
  activeStepIndex,
  getParentFlows,
  getSubFlows,
}: FlowDropdownProps) {
  // ── Dropdown state ──────────────────────────────────────────────────────

  const [isOpen, setIsOpen] = useState(false);
  const [activeFlowIndex, setActiveFlowIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const hasFlow = activeFlow !== null;

  // Compute parent / subflow lists for the active flow
  const parentFlows = hasFlow ? getParentFlows(activeFlow!.id) : [];
  const subFlows = hasFlow ? getSubFlows(activeFlow!.id) : [];

  // ── Click outside handler ───────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveFlowIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ── Keyboard navigation ─────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          const idx = flows.findIndex((f) => f.id === activeFlow?.id);
          setActiveFlowIndex(idx >= 0 ? idx : 0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveFlowIndex((prev) => (prev + 1 >= flows.length ? 0 : prev + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveFlowIndex((prev) => (prev - 1 < 0 ? flows.length - 1 : prev - 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeFlowIndex >= 0 && flows[activeFlowIndex]) {
            onSelectFlow(flows[activeFlowIndex].id);
            setIsOpen(false);
            setActiveFlowIndex(-1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setActiveFlowIndex(-1);
          break;
      }
    },
    [isOpen, activeFlowIndex, flows, activeFlow?.id, onSelectFlow],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Text as="span" size="sm" weight="medium">
          {hasFlow ? activeFlow.title : 'Flow auswählen\u2026'}
        </Text>
      </Button>

      {/* Dropdown panel – uses <section> to avoid div-styling lint */}
      {isOpen && (
        <section
          ref={panelRef}
          role="listbox"
          className="absolute z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {/* Parent flow links */}
          {parentFlows.length > 0 && (
            <section className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              {parentFlows.map((pf) => (
                <Button
                  key={pf.id}
                  variant="link"
                  size="sm"
                  onClick={() => {
                    onSelectFlow(pf.id);
                    setIsOpen(false);
                  }}
                >
                  {'\u2191'} Parent: {pf.title}
                </Button>
              ))}
            </section>
          )}

          {/* Flow selection list */}
          <section
            className="divide-y divide-gray-100 border-b border-gray-200 dark:divide-gray-700 dark:border-gray-600"
            role="none"
          >
            {flows.length === 0 ? (
              <div>
                <Text as="span" size="xs" color="muted">
                  Keine Flows definiert
                </Text>
              </div>
            ) : (
              flows.map((f, index) => {
                const isSelected = f.id === activeFlow?.id;
                const isActive = index === activeFlowIndex;
                return (
                  <section
                    key={f.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => {
                      onSelectFlow(f.id);
                      setIsOpen(false);
                      setActiveFlowIndex(-1);
                    }}
                    onMouseEnter={() => setActiveFlowIndex(index)}
                    className={`cursor-pointer px-3 py-1.5 transition-colors ${
                      isActive || isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Text
                      as="span"
                      size="sm"
                      weight={isSelected ? 'semibold' : 'normal'}
                    >
                      {f.title}
                    </Text>
                  </section>
                );
              })
            )}
          </section>

          {/* Step list (only when a flow is selected) */}
          {hasFlow && (
            <section>
              <div className={sectionLabelVariants()}>
                <Text as="span" size="xs" color="muted" weight="semibold" uppercase>
                  Steps
                </Text>
              </div>
              <FlowStepList
                steps={activeFlow.steps}
                activeStepIndex={activeStepIndex}
                onSelectStep={(index) => {
                  goToStep(index);
                  setIsOpen(false);
                }}
              />
            </section>
          )}

          {/* Subflow links */}
          {subFlows.length > 0 && (
            <section className="border-t border-gray-100 px-3 py-2 dark:border-gray-700">
              <Text as="span" size="xs" color="muted">
                {'\u2193'} Subflows:
              </Text>
              {subFlows.map((sf) => (
                <Button
                  key={sf.id}
                  variant="link"
                  size="sm"
                  onClick={() => {
                    onSelectFlow(sf.id);
                    setIsOpen(false);
                  }}
                >
                  {sf.title}
                </Button>
              ))}
            </section>
          )}
        </section>
      )}
    </div>
  );
}
