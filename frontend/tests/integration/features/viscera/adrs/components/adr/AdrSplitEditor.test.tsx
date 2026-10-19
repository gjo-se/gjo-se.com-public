import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdrSplitEditor from '@src/features/viscera/adrs/components/adr/AdrSplitEditor';

import { renderWithWorkspace } from '../../../visceraTestUtils';

describe('AdrSplitEditor', () => {
  it('renders both editor and preview panes', () => {
    renderWithWorkspace(
      <AdrSplitEditor rawText={'# Titel\n\nInhalt.'} previewContent={'# Titel\n\nInhalt.'} />,
    );

    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Titel' })).toBeInTheDocument();
  });

  it('exposes an accessible resize separator', () => {
    renderWithWorkspace(<AdrSplitEditor rawText={'# Titel'} previewContent={'# Titel'} />);

    expect(
      screen.getByRole('separator', { name: 'Editor- und Preview-Größe anpassen' }),
    ).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('renders an empty preview without crashing', () => {
    renderWithWorkspace(<AdrSplitEditor rawText="" previewContent="" />);

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
