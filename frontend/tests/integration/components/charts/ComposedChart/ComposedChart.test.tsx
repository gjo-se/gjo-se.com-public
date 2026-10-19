import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ComposedChart from '@src/components/charts/ComposedChart/ComposedChart';

const chartProps = {
  data: [
    { week: 'KW 40', applications: 4 },
    { week: 'KW 41', applications: 7 },
  ],
  xDataKey: 'week',
  bars: [{ dataKey: 'applications', name: 'Bewerbungen' }],
};

describe('ComposedChart', () => {
  it('renders the bar chart for the supplied data', async () => {
    render(<ComposedChart chartProps={chartProps} />);

    await waitFor(() => {
      expect(document.querySelector('canvas')).not.toBeNull();
    });
  });

  it('renders the loading placeholder while data is loading', () => {
    const { container } = render(
      <ComposedChart chartProps={{ ...chartProps, loading: true }} />,
    );

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders the error message when the chart data failed to load', () => {
    render(
      <ComposedChart chartProps={{ ...chartProps, errorMessage: 'Keine Chart-Daten' }} />,
    );

    expect(screen.getByText('Keine Chart-Daten')).toBeVisible();
  });
});
