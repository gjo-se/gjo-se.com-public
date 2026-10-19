import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DetailsTab } from '@src/features/viscera/viewer/components/panel/DetailsTab';

import { makeObjectDetail, renderWithWorkspace } from '../../../visceraTestUtils';

import type { ObjectDetail } from '@src/features/viscera/viewer/hooks/useObjectDetail';

function renderTab(overrides: Partial<Parameters<typeof DetailsTab>[0]> = {}) {
  const props = {
    detail: makeObjectDetail() as ObjectDetail,
    copied: false,
    onCopy: vi.fn(),
    onFieldSave: vi.fn().mockResolvedValue({ success: true }),
    onStatusChange: vi.fn(),
    ...overrides,
  };
  renderWithWorkspace(<DetailsTab {...props} />);
  return props;
}

describe('DetailsTab', () => {
  it('renders the metadata header and configured fields', () => {
    renderTab();

    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description (LLM-ready)')).toBeInTheDocument();
    expect(screen.getAllByText('Backend container').length).toBeGreaterThan(0);
  });

  it('saves an inline edited field through the provided handler', async () => {
    const view = renderTab();

    fireEvent.click(screen.getByRole('button', { name: /Backend$/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Backend Core' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() =>
      expect(view.onFieldSave).toHaveBeenCalledWith('backend', 'name', 'Backend Core'),
    );
  });

  it('shows technology candidates as suggestions', () => {
    renderTab({
      detail: makeObjectDetail({
        technologies: [],
        technologyCandidates: [{ slug: 'fastapi', name: 'FastAPI' }],
        fields: [
          {
            label: 'Technology',
            value: [],
            field: 'technologies',
            editable: true,
            editor: 'entity-multi',
          },
        ],
      }),
    });

    expect(screen.getByText('Vorschläge:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FastAPI' })).toBeInTheDocument();
  });

  it('renders a non-editable field as plain text', () => {
    renderTab({
      detail: makeObjectDetail({
        fields: [{ label: 'Links', value: '—', field: 'links' }],
      }),
    });

    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
