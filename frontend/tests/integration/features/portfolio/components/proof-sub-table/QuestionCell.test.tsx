import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import QuestionCell from '@src/features/portfolio/components/proof-sub-table/QuestionCell';

describe('QuestionCell', () => {
  it('renders a dash when the question is empty', () => {
    render(<QuestionCell value="" onSave={vi.fn()} />);

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('renders the question as text', () => {
    render(<QuestionCell value="Warum passt das?" onSave={vi.fn()} />);

    expect(screen.getByText('Warum passt das?')).toBeInTheDocument();
  });

  it('saves the edited question on Cmd+Enter', async () => {
    const onSave = vi.fn();
    render(<QuestionCell value="Alt" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button'));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Neu?');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith('Neu?');
  });

  it('cancels the edit on Escape without saving', async () => {
    const onSave = vi.fn();
    render(<QuestionCell value="Alt" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button'));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Verworfen');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Alt')).toBeInTheDocument();
  });
});
