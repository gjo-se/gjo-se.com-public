import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import AboutMe from '@src/components/molecules/AboutMe/AboutMe';

describe('AboutMe', () => {
  it('renders the portrait, role and all paragraphs', () => {
    render(
      <AboutMe
        name="Gregory Erdmann"
        role="Senior Developer"
        initials="GE"
        paragraphs={['Erster Absatz.', 'Zweiter Absatz.']}
      />,
    );

    expect(screen.getByText('Erster Absatz.')).toBeVisible();
    expect(screen.getByText('Zweiter Absatz.')).toBeVisible();
    expect(screen.getByText('Gregory Erdmann')).toBeVisible();
  });

  it('invokes the download handler from the labelled button', async () => {
    const onDownload = vi.fn();
    render(
      <AboutMe
        name="Gregory Erdmann"
        initials="GE"
        paragraphs={['Absatz.']}
        downloadLabel="Lebenslauf herunterladen"
        onDownload={onDownload}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Lebenslauf herunterladen' }),
    );

    expect(onDownload).toHaveBeenCalledOnce();
  });

  it('renders no download button without a label', () => {
    render(<AboutMe name="Gregory Erdmann" initials="GE" paragraphs={['Absatz.']} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
