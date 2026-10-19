import { fireEvent, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import Toolbar from '@src/features/viscera/viewer/Toolbar';

import { makeWorkspace, renderWithWorkspace } from '../visceraTestUtils';

import type { ToolbarProps } from '@src/features/viscera/viewer/Toolbar';

function toolbarProps(overrides: Partial<ToolbarProps> = {}): ToolbarProps {
  return {
    variant: 'full',
    activeWorkspace: makeWorkspace(),
    currentViewKey: 'SystemContext',
    onViewKeyChange: vi.fn(),
    onResetLayout: vi.fn(),
    onScanCode: vi.fn(),
    scanCodeRunning: false,
    onToggleFullscreen: vi.fn(),
    isFullscreen: false,
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...overrides,
  };
}

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  const props = toolbarProps(overrides);
  renderWithWorkspace(
    <ReactFlowProvider>
      <Toolbar {...props} />
    </ReactFlowProvider>,
  );
  return props;
}

describe('Toolbar', () => {
  it('renders the breadcrumb and core actions in the full variant', () => {
    renderToolbar();

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Diagrams/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Layout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan Code' })).toBeInTheDocument();
  });

  it('switches the diagram world via the source group', () => {
    const view = renderToolbar({ source: 'code', onSourceChange: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: 'Golden' }));

    expect(view.onSourceChange).toHaveBeenCalledWith('golden');
  });

  it('asks for confirmation before resetting the layout', () => {
    const view = renderToolbar();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Layout' }));
    expect(screen.getByText('Layout zurücksetzen bestätigen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));

    expect(view.onResetLayout).toHaveBeenCalledOnce();
  });

  it('disables undo and redo when no history exists', () => {
    renderToolbar();

    expect(screen.getByTitle('Undo (⌘Z)')).toBeDisabled();
    expect(screen.getByTitle('Redo (⌘⇧Z)')).toBeDisabled();
  });

  it('renders the compact fullscreen controls', () => {
    renderToolbar({ variant: 'fullscreen', isFullscreen: true });

    expect(screen.getByRole('button', { name: 'Scan Code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vollbild beenden (Taste F)' })).toBeInTheDocument();
  });

  it('offers the L4 view flip only for module views', () => {
    const { rerender } = renderWithWorkspace(
      <ReactFlowProvider>
        <Toolbar {...toolbarProps()} />
      </ReactFlowProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Sicht B (Sigma)' })).toBeNull();

    rerender(
      <ReactFlowProvider>
        <Toolbar
          {...toolbarProps({
            isModuleView: true,
            viewMode: 'reactflow',
            onToggleViewMode: vi.fn(),
          })}
        />
      </ReactFlowProvider>,
    );

    expect(screen.getByRole('button', { name: 'Sicht B (Sigma)' })).toBeInTheDocument();
  });
});
