import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DiagramsDropdown from '@src/features/viscera/viewer/components/misc/DiagramsDropdown';

import { makeDiagram } from '../../../visceraTestUtils';

const DIAGRAMS = [
  makeDiagram({ key: 'system-context', name: 'System Context', type: 'systemContext' }),
  makeDiagram({ key: 'backend-context', name: 'Backend', type: 'container' }),
];

function openDropdown(overrides: Partial<Parameters<typeof DiagramsDropdown>[0]> = {}) {
  const props = {
    diagrams: DIAGRAMS,
    currentViewKey: 'system-context',
    onSelect: vi.fn(),
    ...overrides,
  };
  render(<DiagramsDropdown {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /Diagrams/ }));
  return props;
}

describe('DiagramsDropdown', () => {
  it('lists diagrams grouped by level', () => {
    openDropdown();

    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /system-context/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: /backend-context/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('filters the list by the search query', () => {
    openDropdown();

    fireEvent.change(screen.getByLabelText('Diagramm-Namen filtern'), {
      target: { value: 'backend' },
    });

    expect(screen.queryByRole('option', { name: /system-context/ })).toBeNull();
    expect(screen.getByRole('option', { name: /backend-context/ })).toBeInTheDocument();
  });

  it('shows an empty hint when nothing matches', () => {
    openDropdown();

    fireEvent.change(screen.getByLabelText('Diagramm-Namen filtern'), {
      target: { value: 'nope' },
    });

    expect(screen.getByText('Keine Diagramme gefunden.')).toBeInTheDocument();
  });

  it('selects a diagram and closes the overlay', () => {
    const props = openDropdown();

    fireEvent.click(screen.getByRole('option', { name: /backend-context/ }));

    expect(props.onSelect).toHaveBeenCalledWith('backend-context');
    expect(screen.queryByLabelText('Diagramm-Namen filtern')).toBeNull();
  });

  it('creates a diagram from the footer', () => {
    const onCreateDiagram = vi.fn();
    openDropdown({ onCreateDiagram });

    fireEvent.click(screen.getByRole('button', { name: '＋ Diagram' }));

    expect(onCreateDiagram).toHaveBeenCalledOnce();
  });

  it('requires a second click to delete a diagram', () => {
    const onDeleteDiagram = vi.fn();
    openDropdown({ onDeleteDiagram });

    const option = screen.getByRole('option', { name: /backend-context/ });
    fireEvent.mouseEnter(option);
    fireEvent.click(screen.getByTitle('Diagramm löschen'));

    expect(onDeleteDiagram).not.toHaveBeenCalled();
    expect(screen.getByTitle('Klicken zum Bestätigen')).toBeInTheDocument();
  });

  it('shows the unassigned badge and opens the unassigned view', () => {
    const onShowUnassigned = vi.fn();
    openDropdown({ unassignedCount: 3, onShowUnassigned });

    fireEvent.click(screen.getByText('⚡ 3 unassigned'));

    expect(onShowUnassigned).toHaveBeenCalledOnce();
  });

  it('renders the diagram status badge', () => {
    openDropdown();

    expect(screen.getAllByText('approved').length).toBeGreaterThan(0);
  });
});
