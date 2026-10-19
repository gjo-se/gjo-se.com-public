import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupGhostRow from '@src/features/fbf/skill/components/skill-group-admin-tab/SkillGroupGhostRow';

const INITIAL = { label_de: '', label_en: '', priority: 'medium' };

/** Stateful harness mirroring the parent that owns the ghost data. */
function GhostHarness({
  onChange,
  onSubmit = () => undefined,
  error = null,
}: {
  onChange: (field: string, value: string) => void
  onSubmit?: () => void
  error?: string | null
}) {
  const [data, setData] = useState(INITIAL);
  return (
    <table>
      <tbody>
        <SkillGroupGhostRow
          saving={false}
          data={data}
          onChange={(field, value) => {
            setData((prev) => ({ ...prev, [field]: value }));
            onChange(field, value);
          }}
          onSubmit={onSubmit}
          error={error}
        />
      </tbody>
    </table>
  );
}

describe('SkillGroupGhostRow', () => {
  it('renders the required label and priority inputs', () => {
    render(
      <table>
        <tbody>
          <SkillGroupGhostRow
            saving={false}
            data={INITIAL}
            onChange={() => undefined}
            onSubmit={() => undefined}
            error={null}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByPlaceholderText('Label DE *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Label EN')).toBeInTheDocument();
    expect(screen.getByLabelText('Priorität')).toHaveValue('medium');
  });

  it('reports label input changes', async () => {
    const onChange = vi.fn();
    render(<GhostHarness onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText('Label DE *'), 'Backend');

    expect(onChange).toHaveBeenLastCalledWith('label_de', 'Backend');
  });

  it('reports priority changes', async () => {
    const onChange = vi.fn();
    render(<GhostHarness onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Priorität'), 'high');

    expect(onChange).toHaveBeenCalledWith('priority', 'high');
  });

  it('submits on Enter', async () => {
    const onSubmit = vi.fn();
    render(<GhostHarness onChange={() => undefined} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByPlaceholderText('Label DE *'), 'Backend');
    await userEvent.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows the create error instead of the inputs', () => {
    render(
      <GhostHarness
        onChange={() => undefined}
        error="Fehler beim Anlegen der Skill-Gruppe."
      />,
    );

    expect(
      screen.getByText('Fehler beim Anlegen der Skill-Gruppe.'),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Label DE *')).not.toBeInTheDocument();
  });
});
