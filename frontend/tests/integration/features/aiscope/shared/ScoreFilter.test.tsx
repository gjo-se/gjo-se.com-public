import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScoreFilter from '@src/features/aiscope/shared/ScoreFilter';

describe('ScoreFilter', () => {
  it('renders the current numeric value', () => {
    render(<ScoreFilter value={42} onChange={vi.fn()} />);

    expect(screen.getByRole('spinbutton')).toHaveValue(42);
  });

  it('renders an empty input when no value is set', () => {
    render(<ScoreFilter value={null} onChange={vi.fn()} />);

    expect(screen.getByRole('spinbutton')).toHaveValue(null);
    expect(screen.getByPlaceholderText('Score ≥')).toBeInTheDocument();
  });

  it('reports the typed threshold as a number', () => {
    const onChange = vi.fn();
    render(<ScoreFilter value={null} onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '75' } });

    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('clears the filter when the input is emptied', () => {
    const onChange = vi.fn();
    render(<ScoreFilter value={20} onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
