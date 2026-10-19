import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StatementCell from '@src/features/portfolio/components/proof-sub-table/StatementCell';

describe('StatementCell', () => {
  it('renders a dash when the statement is empty', () => {
    render(<StatementCell value="" onSave={vi.fn()} />);

    expect(screen.getByText('\u2013')).toBeInTheDocument();
  });

  it('renders the statement as markdown', () => {
    render(<StatementCell value="Wichtig **fett**" onSave={vi.fn()} />);

    expect(screen.getByText('fett').tagName).toBe('STRONG');
  });

  it('edits via textarea and saves on Cmd+Enter', () => {
    const onSave = vi.fn();
    render(<StatementCell value="Alt" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button'));
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Neu' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(onSave).toHaveBeenCalledWith('Neu');
  });

  it('cancels the edit on Escape without saving', () => {
    const onSave = vi.fn();
    render(<StatementCell value="Alt" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button'));
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Verworfen' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Alt')).toBeInTheDocument();
  });
});
