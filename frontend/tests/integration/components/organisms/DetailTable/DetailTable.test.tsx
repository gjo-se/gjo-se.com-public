import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import DetailTable from '@src/components/organisms/DetailTable/DetailTable';

const rows = [
  { field: 'city', label: 'Stadt', value: 'Berlin' },
  { field: 'country', label: 'Land', value: 'DE' },
];

describe('DetailTable', () => {
  it('renders the title and all rows', () => {
    render(<DetailTable title="Metadaten" rows={rows} onSave={vi.fn()} />);

    expect(screen.getByText('Metadaten')).toBeVisible();
    expect(screen.getByText('Stadt')).toBeVisible();
    expect(screen.getByText('Land')).toBeVisible();
  });

  it('renders additional children below the rows', () => {
    render(
      <DetailTable title="Metadaten" rows={rows} onSave={vi.fn()}>
        <div>Zusatzzeile</div>
      </DetailTable>,
    );

    expect(screen.getByText('Zusatzzeile')).toBeVisible();
  });

  it('propagates the field save of an edited row', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DetailTable title="Metadaten" rows={rows} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'DE' }));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'AT{Enter}');

    expect(onSave).toHaveBeenCalledWith('country', 'AT');
  });
});
