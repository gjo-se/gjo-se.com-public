import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChartShell from '@src/components/charts/ChartShell/ChartShell';

describe('ChartShell', () => {
  it('shows a loading placeholder instead of the chart content', () => {
    const { container } = render(
      <ChartShell loading>
        <span>Chart-Inhalt</span>
      </ChartShell>,
    );

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByText('Chart-Inhalt')).not.toBeInTheDocument();
  });

  it('shows the error message instead of the chart content', () => {
    render(
      <ChartShell errorMessage="Diagramm konnte nicht geladen werden">
        <span>Chart-Inhalt</span>
      </ChartShell>,
    );

    expect(screen.getByText('Diagramm konnte nicht geladen werden')).toBeVisible();
    expect(screen.queryByText('Chart-Inhalt')).not.toBeInTheDocument();
  });

  it('renders legacy children when no option is supplied', () => {
    render(
      <ChartShell height={180}>
        <span>Chart-Inhalt</span>
      </ChartShell>,
    );

    expect(screen.getByText('Chart-Inhalt')).toBeVisible();
  });
});
