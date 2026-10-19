import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CardHeader from '@src/features/viscera/viewer/components/nodes/CardHeader';

function renderHeader(overrides: Partial<Parameters<typeof CardHeader>[0]> = {}) {
  const props = {
    kind: 'container' as const,
    width: 280,
    name: 'Backend',
    external: false,
    firstTechSlug: undefined,
    editValue: '',
    onEditValueChange: vi.fn(),
    onEditKeyDown: vi.fn(),
    ...overrides,
  };
  render(
    <svg>
      <CardHeader {...props} />
    </svg>,
  );
  return props;
}

describe('CardHeader', () => {
  it('renders the card name', () => {
    renderHeader();

    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('marks external systems with a labelled icon', () => {
    renderHeader({ external: true });

    expect(screen.getByText('Externes System')).toBeInTheDocument();
  });

  it('renders a short description', () => {
    renderHeader({ description: 'Die zentrale API des Systems' });

    expect(screen.getByText('Die zentrale API des Systems')).toBeInTheDocument();
  });

  it('omits descriptions above 64 characters', () => {
    renderHeader({ description: 'x'.repeat(65) });

    expect(screen.queryByText('x'.repeat(65))).toBeNull();
  });

  it('switches to the inline edit input', () => {
    const view = renderHeader({
      isEditing: true,
      editValue: 'Backend',
      editingLabel: 'Name eingeben',
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Backend API' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(view.onEditValueChange).toHaveBeenCalledWith('Backend API');
    expect(view.onEditKeyDown).toHaveBeenCalled();
  });
});
