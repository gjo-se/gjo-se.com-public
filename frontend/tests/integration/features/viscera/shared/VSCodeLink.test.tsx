import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VSCodeLink from '@src/features/viscera/shared/VSCodeLink';

import { renderWithWorkspace } from '../visceraTestUtils';

describe('VSCodeLink', () => {
  it('builds a vscode url from the file path', () => {
    renderWithWorkspace(
      <VSCodeLink path="/architecture/nodes/backend.yml" label="backend.yml" type="yaml" />,
    );

    expect(
      screen.getByRole('link', { name: /backend\.yml/ }).getAttribute('href'),
    ).toMatch(/^vscode:\/\/file\/.*\/architecture\/nodes\/backend\.yml$/);
  });

  it('falls back to the path when no label is given', () => {
    renderWithWorkspace(
      <VSCodeLink path="/architecture/adr/0001-test.md" label="" type="adr" />,
    );

    expect(screen.getByRole('link', { name: /0001-test\.md/ })).toBeInTheDocument();
  });

  it('copies the path to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderWithWorkspace(
      <VSCodeLink path="/architecture/nodes/backend.yml" label="backend.yml" type="yaml" />,
    );

    fireEvent.click(screen.getByTitle('Pfad kopieren'));

    await waitFor(() =>
      expect(screen.getByTitle('Kopiert!')).toBeInTheDocument(),
    );
    expect(writeText).toHaveBeenCalledWith('/architecture/nodes/backend.yml');
  });
});
