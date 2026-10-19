import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import CardContextMenu from '@src/features/viscera/viewer/components/nodes/CardContextMenu';

import type { CardContextMenuHandle } from '@src/features/viscera/viewer/components/nodes/CardContextMenu';
import type { ComponentProps } from 'react';

type MenuProps = ComponentProps<typeof CardContextMenu>;

function Harness(props: Partial<MenuProps>) {
  const ref = useRef<CardContextMenuHandle>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.open(20, 20)}>
        Menü öffnen
      </button>
      <CardContextMenu ref={ref} nodeId="node-1" name="Backend" kind="container" {...props} />
    </>
  );
}

function openMenu(overrides: Partial<MenuProps> = {}) {
  const props = { onCreateComponent: vi.fn(), ...overrides };
  render(<Harness {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));
  return props;
}

describe('CardContextMenu', () => {
  it('creates a child component for a container card', () => {
    const props = openMenu();

    fireEvent.click(screen.getByRole('button', { name: '＋ Component' }));

    expect(props.onCreateComponent).toHaveBeenCalledWith('node-1');
    expect(screen.queryByText('📋 ID kopieren')).toBeNull();
  });

  it('navigates into a child diagram', () => {
    const onNavigateToChild = vi.fn();
    openMenu({
      childDiagrams: [
        {
          key: 'backend-components',
          name: 'Backend Components',
          level: 'component',
          parentId: 'backend',
          isDefault: false,
        },
      ],
      onNavigateToChild,
    });

    fireEvent.click(screen.getByRole('button', { name: /Backend Components/ }));

    expect(onNavigateToChild).toHaveBeenCalledWith('backend-components');
  });

  it('opens a derived component view for containers without children', () => {
    const onOpenDerivedView = vi.fn();
    openMenu({ canOpenComponentView: true, onOpenDerivedView });

    fireEvent.click(screen.getByRole('button', { name: 'Component-View anzeigen (L3)' }));

    expect(onOpenDerivedView).toHaveBeenCalledWith('node-1', 'component');
  });

  it('opens a derived module view for components', () => {
    const onOpenDerivedView = vi.fn();
    openMenu({ kind: 'component', canOpenModuleView: true, onOpenDerivedView });

    fireEvent.click(screen.getByRole('button', { name: 'Module anzeigen (L4)' }));

    expect(onOpenDerivedView).toHaveBeenCalledWith('node-1', 'module');
  });

  it('requires confirmation before deleting and can cancel', () => {
    openMenu();

    fireEvent.click(screen.getByRole('button', { name: '🗑 Löschen' }));
    expect(screen.getByText('„Backend“ wirklich löschen?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(screen.getByText('📋 ID kopieren')).toBeInTheDocument();
  });

  it('closes the menu on Escape', () => {
    openMenu();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByText('📋 ID kopieren')).toBeNull();
  });
});
