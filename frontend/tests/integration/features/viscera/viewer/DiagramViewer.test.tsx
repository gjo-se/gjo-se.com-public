import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DiagramViewer from '@src/features/viscera/viewer/DiagramViewer';

import { makeWorkspace } from '../visceraTestUtils';

import type { DiagramViewerProps } from '@src/features/viscera/viewer/DiagramViewer';

function viewerProps(overrides: Partial<DiagramViewerProps> = {}): DiagramViewerProps {
  return {
    ist: makeWorkspace(),
    loading: false,
    error: null,
    onReload: vi.fn(),
    currentViewKey: 'SystemContext',
    onViewKeyChange: vi.fn(),
    onObjectClick: vi.fn(),
    hiddenNodeIds: new Set(),
    dimmedNodeIds: new Set(),
    isFullscreen: false,
    layoutResetKey: 0,
    hoveredKey: null,
    isCanvasEmpty: false,
    onResetAll: vi.fn(),
    activeFlowStep: null,
    ...overrides,
  };
}

describe('DiagramViewer', () => {
  it('shows the initial loading hint', () => {
    render(<DiagramViewer {...viewerProps({ loading: true })} />);

    expect(screen.getByText('Loading workspace data…')).toBeInTheDocument();
  });

  it('shows a workspace load error with a retry action', () => {
    const onReload = vi.fn();
    render(
      <DiagramViewer {...viewerProps({ error: 'HTTP 500', onReload })} />,
    );

    expect(screen.getByText('Fehler beim Laden des Workspace:')).toBeInTheDocument();
    expect(screen.getByText('HTTP 500')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }));

    expect(onReload).toHaveBeenCalledOnce();
  });

  it('shows a hint when no workspace exists', () => {
    render(<DiagramViewer {...viewerProps({ ist: null })} />);

    expect(screen.getByText('Keine Workspace-Daten gefunden')).toBeInTheDocument();
  });

  it('offers a filter reset when the canvas is empty', () => {
    const onResetAll = vi.fn();
    render(<DiagramViewer {...viewerProps({ isCanvasEmpty: true, onResetAll })} />);

    expect(screen.getByText('Keine Objekte für die aktiven Filter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Alle Filter zurücksetzen' }));

    expect(onResetAll).toHaveBeenCalledOnce();
  });
});
