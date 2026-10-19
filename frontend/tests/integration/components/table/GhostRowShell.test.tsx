import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { GhostRowShell } from '@src/components/table/GhostRowShell';

describe('GhostRowShell', () => {
  it('renders the render-prop cells', () => {
    render(
      <table>
        <tbody>
          <GhostRowShell saving={false} error={null} colSpan={2} onSubmit={vi.fn()}>
            {() => (
              <tr>
                <td>Zelle</td>
              </tr>
            )}
          </GhostRowShell>
        </tbody>
      </table>,
    );

    expect(screen.getByText('Zelle')).toBeVisible();
  });

  it('shows the error instead of the cells', () => {
    render(
      <table>
        <tbody>
          <GhostRowShell saving={false} error="Pflichtfeld fehlt" colSpan={2} onSubmit={vi.fn()}>
            {() => <tr><td>Zelle</td></tr>}
          </GhostRowShell>
        </tbody>
      </table>,
    );

    expect(screen.getByText('Pflichtfeld fehlt')).toBeVisible();
    expect(screen.queryByText('Zelle')).not.toBeInTheDocument();
  });

  it('submits on Enter and marks the row as touched', async () => {
    const onSubmit = vi.fn();
    render(
      <table>
        <tbody>
          <GhostRowShell saving={false} error={null} colSpan={1} onSubmit={onSubmit}>
            {({ touched, handleKeyDown }) => (
              <tr>
                <td>
                  <input aria-label="Feld" onKeyDown={handleKeyDown} />
                  {touched ? <span>berührt</span> : null}
                </td>
              </tr>
            )}
          </GhostRowShell>
        </tbody>
      </table>,
    );

    await userEvent.type(screen.getByRole('textbox', { name: 'Feld' }), '{Enter}');

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(await screen.findByText('berührt')).toBeVisible();
  });

  it('does not submit while saving', async () => {
    const onSubmit = vi.fn();
    render(
      <table>
        <tbody>
          <GhostRowShell saving error={null} colSpan={1} onSubmit={onSubmit}>
            {({ handleKeyDown }) => (
              <tr>
                <td><input aria-label="Feld" onKeyDown={handleKeyDown} /></td>
              </tr>
            )}
          </GhostRowShell>
        </tbody>
      </table>,
    );

    await userEvent.type(screen.getByRole('textbox', { name: 'Feld' }), '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
