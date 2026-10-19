import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ReassignCell from '@src/features/fbf/job-role/components/curation/ReassignCell';

const TARGETS = [
  { value: '2', label: 'Backend' },
  { value: '3', label: 'Frontend' },
];

/**
 * Opens the target combobox and picks the first matching option via keyboard
 * (the popup closes on pointer-down, so keyboard selection is the stable path).
 *
 * @param query Optional search text typed into the combobox first.
 */
async function chooseFirstTarget(query?: string) {
  await userEvent.click(screen.getByPlaceholderText('Projekte umhängen zu…'));
  if (query) {
    await userEvent.type(screen.getByPlaceholderText('Projekte umhängen zu…'), query);
  }
  await userEvent.keyboard('{ArrowDown}{Enter}');
}

describe('ReassignCell', () => {
  it('renders the reassign combobox with all targets', () => {
    render(<ReassignCell targetItems={TARGETS} onReassign={() => undefined} />);

    expect(
      screen.getByPlaceholderText('Projekte umhängen zu…'),
    ).toBeInTheDocument();
  });

  it('asks for confirmation before reassigning a project', async () => {
    const onReassign = vi.fn();
    render(<ReassignCell targetItems={TARGETS} onReassign={onReassign} />);

    await chooseFirstTarget();

    expect(await screen.findByText('Sicherheitsabfrage')).toBeInTheDocument();
    expect(onReassign).not.toHaveBeenCalled();

    (await screen.findByRole('button', { name: 'Bestätigen' })).click();

    expect(onReassign).toHaveBeenCalledWith(2);
  });

  it('cancels the reassignment without calling the callback', async () => {
    const onReassign = vi.fn();
    render(<ReassignCell targetItems={TARGETS} onReassign={onReassign} />);

    await chooseFirstTarget('fron');
    (await screen.findByRole('button', { name: 'Abbrechen' })).click();

    expect(onReassign).not.toHaveBeenCalled();
  });

  it('filters the target list by the typed query', async () => {
    render(<ReassignCell targetItems={TARGETS} onReassign={() => undefined} />);

    await userEvent.type(
      screen.getByPlaceholderText('Projekte umhängen zu…'),
      'fron',
    );

    expect(await screen.findByText('Frontend')).toBeInTheDocument();
    expect(screen.queryByText('Backend')).not.toBeInTheDocument();
  });
});
