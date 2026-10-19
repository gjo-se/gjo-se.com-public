import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TypeMenuItems from '@src/features/viscera/viewer/components/overlay/TypeMenuItems';

describe('TypeMenuItems', () => {
  it('offers every supported object type', () => {
    render(<TypeMenuItems onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Add System' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Container' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Component' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Store' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Person' })).toBeInTheDocument();
  });

  it('reports the clicked type', () => {
    const onSelect = vi.fn();
    render(<TypeMenuItems onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Store' }));

    expect(onSelect).toHaveBeenCalledWith('store');
  });

  it('supports keyboard selection', () => {
    const onSelect = vi.fn();
    render(<TypeMenuItems onSelect={onSelect} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Add Component' }), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('component');
  });
});
