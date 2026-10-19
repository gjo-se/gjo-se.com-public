import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CandidateNodeList from '@src/features/viscera/viewer/components/overlay/CandidateNodeList';

const CANDIDATES = [
  { id: 'backend', name: 'Backend' },
  { id: 'database', name: 'Database' },
];

describe('CandidateNodeList', () => {
  it('lists every candidate with its id', () => {
    render(<CandidateNodeList candidates={CANDIDATES} onSelect={vi.fn()} />);

    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('shows an empty hint without candidates', () => {
    render(<CandidateNodeList candidates={[]} onSelect={vi.fn()} />);

    expect(screen.getByText('Keine passenden Nodes verfügbar')).toBeInTheDocument();
  });

  it('selects a candidate by click and by keyboard', () => {
    const onSelect = vi.fn();
    render(<CandidateNodeList candidates={CANDIDATES} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Backend/ }));
    fireEvent.keyDown(screen.getByRole('button', { name: /Database/ }), { key: 'Enter' });

    expect(onSelect).toHaveBeenNthCalledWith(1, 'backend');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'database');
  });

  it('ignores selection while disabled', () => {
    const onSelect = vi.fn();
    render(<CandidateNodeList candidates={CANDIDATES} onSelect={onSelect} disabled />);

    const entry = screen.getByRole('button', { name: /Backend/ });
    expect(entry).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(entry);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
