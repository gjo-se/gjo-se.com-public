import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ScoreFilter from '@src/features/fbf/skill/components/data-table/ScoreFilter';

describe('ScoreFilter', () => {
  it('renders the current value with bounds and placeholder', () => {
    render(<ScoreFilter value={2} onChange={() => undefined} placeholder="Score ≥" />);

    const input = screen.getByPlaceholderText('Score ≥');
    expect(input).toHaveValue(2);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '5');
  });

  it('reports a typed threshold as number', async () => {
    const onChange = vi.fn();
    render(<ScoreFilter value={null} onChange={onChange} placeholder="Score ≥" />);

    await userEvent.type(screen.getByPlaceholderText('Score ≥'), '4');

    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('reports null when the input is cleared', async () => {
    const onChange = vi.fn();
    render(<ScoreFilter value={3} onChange={onChange} placeholder="Score ≥" />);

    await userEvent.clear(screen.getByPlaceholderText('Score ≥'));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('renders an empty input for a null value', () => {
    render(<ScoreFilter value={null} onChange={() => undefined} placeholder="Score ≥" />);

    expect(screen.getByPlaceholderText('Score ≥')).toHaveValue(null);
  });
});
