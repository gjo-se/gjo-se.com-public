import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupLabelCell from '@src/features/fbf/skill/components/skill-group-admin-tab/SkillGroupLabelCell';

describe('SkillGroupLabelCell', () => {
  it('renders the group label', () => {
    render(<SkillGroupLabelCell value="Backend" onSave={() => undefined} />);

    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('renders a dash for an empty label', () => {
    render(<SkillGroupLabelCell value="   " onSave={() => undefined} />);

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('saves the edited label on Enter', async () => {
    const onSave = vi.fn();
    render(<SkillGroupLabelCell value="Backend" onSave={onSave} />);

    await userEvent.click(screen.getByText('Backend'));
    const input = screen.getByLabelText('Gruppenlabel');
    await userEvent.clear(input);
    await userEvent.type(input, 'Backend Services');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('Backend Services');
  });

  it('cancels the edit on Escape', async () => {
    const onSave = vi.fn();
    render(<SkillGroupLabelCell value="Backend" onSave={onSave} />);

    await userEvent.click(screen.getByText('Backend'));
    await userEvent.type(screen.getByLabelText('Gruppenlabel'), 'Anders');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });
});
