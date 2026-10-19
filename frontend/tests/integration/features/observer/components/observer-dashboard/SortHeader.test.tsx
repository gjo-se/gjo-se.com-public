import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SortHeader from '@src/features/observer/components/observer-dashboard/SortHeader';

function renderInHead(ui: React.ReactElement) {
  return render(
    <table>
      <thead>
        <tr>{ui}</tr>
      </thead>
    </table>,
  );
}

describe('SortHeader', () => {
  it('renders the column label without a direction marker when inactive', () => {
    renderInHead(
      <SortHeader field="task" label="Task" current="created_at" dir="desc" onClick={vi.fn()} />,
    );

    expect(screen.getByRole('columnheader', { name: 'Task' })).toBeInTheDocument();
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
    expect(screen.queryByText('▼')).not.toBeInTheDocument();
  });

  it('marks the active sort field with the ascending direction', () => {
    renderInHead(
      <SortHeader field="task" label="Task" current="task" dir="asc" onClick={vi.fn()} />,
    );

    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('marks the active sort field with the descending direction', () => {
    renderInHead(
      <SortHeader field="task" label="Task" current="task" dir="desc" onClick={vi.fn()} />,
    );

    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('reports the clicked field to the sort handler', () => {
    const onClick = vi.fn();
    renderInHead(
      <SortHeader field="severity" label="Schweregrad" current="task" dir="desc" onClick={onClick} />,
    );

    fireEvent.click(screen.getByRole('columnheader', { name: 'Schweregrad' }));

    expect(onClick).toHaveBeenCalledWith('severity');
  });
});
