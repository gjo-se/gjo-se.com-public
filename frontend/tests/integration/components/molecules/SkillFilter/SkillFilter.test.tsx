import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillFilter from '@src/components/molecules/SkillFilter/SkillFilter';

const allSkills = ['Azure', 'Docker', 'Kubernetes', 'Terraform'];

describe('SkillFilter', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<SkillFilter allSkills={allSkills} selectedSkills={[]} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Skills filtern…')).toBeVisible();
  });

  it('renders the selected skills as removable chips', () => {
    render(
      <SkillFilter allSkills={allSkills} selectedSkills={['Azure', 'Docker']} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Azure')).toBeVisible();
    expect(screen.getByText('Docker')).toBeVisible();
    expect(screen.getAllByRole('button', { name: '×' })).toHaveLength(2);
  });

  it('removes a skill through its chip control', async () => {
    const onChange = vi.fn();
    render(
      <SkillFilter
        allSkills={allSkills}
        selectedSkills={['Azure', 'Docker']}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: '×' })[1]!);

    expect(onChange).toHaveBeenCalledWith(['Azure']);
  });

  it('reports the additional skill when an option is toggled', async () => {
    const onChange = vi.fn();
    render(<SkillFilter allSkills={allSkills} selectedSkills={['Azure']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    screen.getByText('Docker').click();

    expect(onChange).toHaveBeenCalledWith(['Azure', 'Docker']);
  });

  it('limits the visible chips and shows the overflow count', () => {
    render(
      <SkillFilter
        allSkills={allSkills}
        selectedSkills={['Azure', 'Docker', 'Kubernetes', 'Terraform']}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('+1')).toBeVisible();
    expect(screen.queryByText('Terraform')).not.toBeInTheDocument();
  });

  it('shows an empty hint when no skill matches the query', async () => {
    render(<SkillFilter allSkills={allSkills} selectedSkills={[]} onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 'xyz');

    expect(await screen.findByText('Keine Skills')).toBeVisible();
  });
});
