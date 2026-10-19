import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { TranslationFields } from '@src/features/portfolio/components/translation/TranslationFields';

const TRANSLATION = {
  title: 'Fixture-Titel',
  sub_title: 'Fixture-Untertitel',
  teaser: 'Fixture-Teaser',
  impact_summary: 'Fixture-Wirkung',
};

describe('TranslationFields', () => {
  it('renders the localized fields of the active locale', () => {
    render(
      <TranslationFields locale="de" translation={TRANSLATION} onSave={vi.fn()} />,
    );

    expect(screen.getByText('DE – Übersetzung')).toBeInTheDocument();
    expect(screen.getByText('Fixture-Titel')).toBeInTheDocument();
    expect(screen.getByText('Fixture-Untertitel')).toBeInTheDocument();
    expect(screen.getByText('Fixture-Wirkung')).toBeInTheDocument();
  });

  it('renders empty fields when the translation does not exist yet', () => {
    render(<TranslationFields locale="en" translation={undefined} onSave={vi.fn()} />);

    expect(screen.getByText('EN – Übersetzung')).toBeInTheDocument();
    expect(screen.getAllByText('–').length).toBeGreaterThan(0);
  });

  it('saves an edited title for the current locale', async () => {
    const onSave = vi.fn(async () => undefined);
    render(<TranslationFields locale="de" translation={TRANSLATION} onSave={onSave} />);

    await userEvent.click(screen.getByText('Fixture-Titel'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'Neuer Titel');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('title', 'Neuer Titel');
  });
});
