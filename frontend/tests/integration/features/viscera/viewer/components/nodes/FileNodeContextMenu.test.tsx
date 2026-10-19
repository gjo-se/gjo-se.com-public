import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import FileNodeContextMenu from '@src/features/viscera/viewer/components/nodes/FileNodeContextMenu';

import type { FileNodeContextMenuHandle } from '@src/features/viscera/viewer/components/nodes/FileNodeContextMenu';
import type { ComponentProps } from 'react';

type MenuProps = ComponentProps<typeof FileNodeContextMenu>;

function Harness(props: Partial<MenuProps>) {
  const ref = useRef<FileNodeContextMenuHandle>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.open(20, 20)}>
        Menü öffnen
      </button>
      <FileNodeContextMenu ref={ref} nodeId="backend.api" {...props} />
    </>
  );
}

function openMenu(overrides: Partial<MenuProps> = {}) {
  const props = { onAction: vi.fn(), ...overrides };
  render(<Harness {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));
  return props;
}

describe('FileNodeContextMenu', () => {
  it('offers all module filter actions', () => {
    openMenu();

    expect(screen.getByRole('button', { name: '◎ Fokus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '→ Reaches' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Impact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '⟲ Reset' })).toBeInTheDocument();
  });

  it('dispatches the chosen action with the module id', () => {
    const props = openMenu();

    fireEvent.click(screen.getByRole('button', { name: '→ Reaches' }));

    expect(props.onAction).toHaveBeenCalledWith('reaches', 'backend.api');
  });

  it('shows Collapse when expanded and Expand when collapsed', () => {
    openMenu({ collapsed: true });

    expect(screen.getByRole('button', { name: '▸ Expand' })).toBeInTheDocument();
  });

  it('closes the menu on Escape', () => {
    openMenu();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: '◎ Fokus' })).toBeNull();
  });
});
