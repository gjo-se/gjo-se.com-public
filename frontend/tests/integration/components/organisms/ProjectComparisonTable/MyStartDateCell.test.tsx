import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import MyStartDateCell from '@src/components/organisms/ProjectComparisonTable/MyStartDateCell';
import { worker } from '@src/mocks/browser';

describe('MyStartDateCell', () => {
  it('shows the raw start as fallback while no override is set', () => {
    render(<MyStartDateCell projectId={1} value={null} fallback="01/2026" onRefetch={vi.fn()} />);

    expect(screen.getByRole('button', { name: '01/2026' })).toBeVisible();
    expect(screen.queryByText('manuell')).not.toBeInTheDocument();
  });

  it('marks an existing override as manual', () => {
    render(<MyStartDateCell projectId={1} value="03/2026" fallback="01/2026" onRefetch={vi.fn()} />);

    expect(screen.getByRole('button', { name: '03/2026' })).toBeVisible();
    expect(screen.getByText('manuell')).toBeVisible();
  });

  it('saves the edited override', async () => {
    let body: unknown;
    worker.use(
      http.patch('/api/v1/admin/fbf/projects/:id/my-start-date', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    const onRefetch = vi.fn();
    render(<MyStartDateCell projectId={1} value={null} fallback="01/2026" onRefetch={onRefetch} />);

    await userEvent.click(screen.getByRole('button', { name: '01/2026' }));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '03/2026{Enter}');

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
    expect(body).toEqual({ my_start_date: '03/2026' });
  });
});
