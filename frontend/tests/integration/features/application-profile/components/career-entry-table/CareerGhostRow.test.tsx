import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CareerGhostRow from '@src/features/application-profile/components/career-entry-table/CareerGhostRow';

import { renderInTable } from '../../../integrationTestUtils';

const EMPTY: Record<string, string> = {};

describe('CareerGhostRow', () => {
  it('renders the inputs derived from the career columns', () => {
    renderInTable(
      <CareerGhostRow saving={false} data={EMPTY} onChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(
      screen.getByPlaceholderText('Senior TYPO3 Developer, gjo:Se, Berlin'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Firma (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Beschreibung DE (optional)')).toBeInTheDocument();
  });

  it('reports input changes', () => {
    const onChange = vi.fn();
    renderInTable(
      <CareerGhostRow saving={false} data={EMPTY} onChange={onChange} onSubmit={vi.fn()} />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('Senior TYPO3 Developer, gjo:Se, Berlin'),
      { target: { value: 'Developer' } },
    );

    expect(onChange).toHaveBeenCalledWith('position', 'Developer');
  });

  it('submits on Enter in a text input', () => {
    const onSubmit = vi.fn();
    renderInTable(
      <CareerGhostRow
        saving={false}
        data={{ position: 'Developer' }}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.keyDown(
      screen.getByPlaceholderText('Senior TYPO3 Developer, gjo:Se, Berlin'),
      { key: 'Enter' },
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit on Enter inside the description textarea', () => {
    const onSubmit = vi.fn();
    renderInTable(
      <CareerGhostRow
        saving={false}
        data={EMPTY}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText('Beschreibung DE (optional)'), {
      key: 'Enter',
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables the inputs while saving', () => {
    renderInTable(
      <CareerGhostRow saving data={EMPTY} onChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(
      screen.getByPlaceholderText('Senior TYPO3 Developer, gjo:Se, Berlin'),
    ).toBeDisabled();
  });
});
