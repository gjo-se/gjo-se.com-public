import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ShortcutHints from '@src/features/viscera/shared/ShortcutHints';

import { renderWithWorkspace } from '../visceraTestUtils';

import type { Shortcut } from '@src/features/viscera/core/useShortcuts';

const SHORTCUTS: Shortcut[] = [
  { key: 'Cmd+K', handler: vi.fn(), description: 'Suche öffnen', group: 'navigation', enabled: true },
  { key: 'F', handler: vi.fn(), description: 'Vollbild', group: 'diagram', enabled: true },
  {
    key: 'Shift+G',
    handler: vi.fn(),
    description: 'Golden wechseln',
    group: 'tools',
    enabled: false,
  },
];

describe('ShortcutHints', () => {
  it('groups the enabled shortcuts and formats their keys', () => {
    renderWithWorkspace(<ShortcutHints shortcuts={SHORTCUTS} open onClose={vi.fn()} />);

    expect(screen.getByText('⌨ Tastaturkürzel')).toBeInTheDocument();
    expect(screen.getByText('⌘+K')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Diagramm')).toBeInTheDocument();
  });

  it('hides disabled shortcuts', () => {
    renderWithWorkspace(<ShortcutHints shortcuts={SHORTCUTS} open onClose={vi.fn()} />);

    expect(screen.queryByText('Golden wechseln')).not.toBeInTheDocument();
    expect(screen.queryByText('Werkzeuge')).not.toBeInTheDocument();
  });

  it('shows an empty hint when no shortcut is enabled', () => {
    renderWithWorkspace(
      <ShortcutHints shortcuts={[SHORTCUTS[2]!]} open onClose={vi.fn()} />,
    );

    expect(screen.getByText('Keine Tastaturkürzel verfügbar.')).toBeInTheDocument();
  });

  it('closes on escape', () => {
    const onClose = vi.fn();
    renderWithWorkspace(<ShortcutHints shortcuts={SHORTCUTS} open onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
