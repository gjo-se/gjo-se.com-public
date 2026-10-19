/**
 * Tests: useQueryParam – bidirectional URL search param with clean-URL defaults.
 *
 * A real MemoryRouter owns the location; the rendered search string is the
 * observable proof that defaults are removed and foreign params are kept.
 */
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useQueryParam } from '@src/hooks/useQueryParam';

import type { ReactNode } from 'react';

function Probe({ paramKey, defaultValue }: { paramKey: string; defaultValue: string }) {
  const [value, setValue] = useQueryParam(paramKey, defaultValue);
  const location = useLocation();

  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': 'value' }, value),
    createElement('span', { 'data-testid': 'search' }, location.search),
    createElement('button', { type: 'button', onClick: () => { setValue('providers'); } }, 'set-providers'),
    createElement('button', { type: 'button', onClick: () => { setValue(defaultValue); } }, 'set-default'),
    createElement('button', { type: 'button', onClick: () => { setValue(''); } }, 'set-empty'),
  );
}

function renderProbe(initialEntry: string, defaultValue = 'models'): void {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialEntry] }, children);

  render(createElement(Probe, { paramKey: 'tab', defaultValue }), { wrapper });
}

describe('useQueryParam', () => {
  it('returns the default when the param is absent', () => {
    renderProbe('/admin');

    expect(screen.getByTestId('value').textContent).toBe('models');
  });

  it('returns the current URL value when present', () => {
    renderProbe('/admin?tab=providers');

    expect(screen.getByTestId('value').textContent).toBe('providers');
  });

  it('writes a non-default value into the URL', () => {
    renderProbe('/admin');

    fireEvent.click(screen.getByRole('button', { name: 'set-providers' }));

    expect(screen.getByTestId('value').textContent).toBe('providers');
    expect(screen.getByTestId('search').textContent).toBe('?tab=providers');
  });

  it('removes the param when the default value is set again', () => {
    renderProbe('/admin?tab=providers&status=active');

    fireEvent.click(screen.getByRole('button', { name: 'set-default' }));

    expect(screen.getByTestId('value').textContent).toBe('models');
    expect(screen.getByTestId('search').textContent).toBe('?status=active');
  });

  it('removes the param when an empty value is set', () => {
    renderProbe('/admin?tab=providers');

    fireEvent.click(screen.getByRole('button', { name: 'set-empty' }));

    expect(screen.getByTestId('search').textContent).toBe('');
  });
});
