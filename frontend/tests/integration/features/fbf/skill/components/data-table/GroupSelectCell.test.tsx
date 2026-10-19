import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GroupSelectCell from '@src/features/fbf/skill/components/data-table/GroupSelectCell';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderFbf } from '../../../fbfTestUtils';

const GROUPS = [
  { id: 1, sort: 1, priority: 'high', label: 'Backend' },
  { id: 2, sort: 2, priority: 'medium', label: 'Frontend' },
];

describe('GroupSelectCell', () => {
  beforeEach(() => {
    worker.use(
      http.get(`${base}/public/fbf/skill-group`, () => HttpResponse.json(GROUPS)),
    );
  });

  it('renders the current group as placeholder', async () => {
    renderFbf(<GroupSelectCell value={1} onCommit={() => undefined} />);

    expect(await screen.findByPlaceholderText('Backend')).toBeInTheDocument();
  });

  it('commits the selected group id', async () => {
    const onCommit = vi.fn();
    renderFbf(<GroupSelectCell value={1} onCommit={onCommit} />);

    fireEvent.click(await screen.findByPlaceholderText('Backend'));
    fireEvent.click(await screen.findByText('Frontend'));

    expect(onCommit).toHaveBeenCalledWith(2);
  });

  it('offers the clear option for an assigned group', async () => {
    renderFbf(<GroupSelectCell value={1} onCommit={() => undefined} />);

    fireEvent.click(await screen.findByPlaceholderText('Backend'));

    expect(await screen.findByText('Keinen Wert setzen')).toBeInTheDocument();
  });

  it('renders a dash placeholder for an unassigned group', async () => {
    renderFbf(<GroupSelectCell value={null} onCommit={() => undefined} />);

    expect(await screen.findByPlaceholderText('–')).toBeInTheDocument();
  });
});
