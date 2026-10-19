import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import GroupCell from '@src/features/fbf/skill/components/data-table/GroupCell';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderFbf } from '../../../fbfTestUtils';

const GROUPS = [
  { id: 1, sort: 1, priority: 'high', label: 'Backend' },
  { id: 2, sort: 2, priority: 'medium', label: 'Frontend' },
];

describe('GroupCell', () => {
  beforeEach(() => {
    worker.use(
      http.get(`${base}/public/fbf/skill-group`, () => HttpResponse.json(GROUPS)),
    );
  });

  it('renders the resolved group label', async () => {
    renderFbf(<GroupCell value={1} onCommit={() => undefined} />);

    expect(await screen.findByText('Backend')).toBeInTheDocument();
  });

  it('renders a dash for an unassigned group', async () => {
    renderFbf(<GroupCell value={null} onCommit={() => undefined} />);

    expect(await screen.findByText('–')).toBeInTheDocument();
  });

  it('opens the group combobox on click', async () => {
    renderFbf(<GroupCell value={1} onCommit={() => undefined} />);

    fireEvent.click(await screen.findByText('Backend'));

    expect(screen.getByPlaceholderText('Backend')).toBeInTheDocument();
  });
});
