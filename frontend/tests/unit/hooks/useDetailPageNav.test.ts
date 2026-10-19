/**
 * Tests: useDetailPageNav – prev/next neighbours and list-context preservation.
 *
 * Runs against a real MemoryRouter; the location state is the input and the
 * resulting route/state (read through useLocation) is the observable output.
 */
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useDetailPageNav } from '@src/hooks/useDetailPageNav';

import type { ReactNode } from 'react';

interface ProbeProps {
  currentId: string | number
  ids: (string | number)[] | null
  from?: string
  detailPath?: string
  paramName?: string
}

function Probe({ currentId, detailPath = '/admin/crm/companies/:id', paramName }: ProbeProps) {
  const nav = useDetailPageNav({
    currentId,
    detailPath,
    defaultBackTo: '/admin/crm/companies',
    paramName,
  });
  const location = useLocation();

  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': 'back' }, nav.backTo),
    createElement('span', { 'data-testid': 'prev' }, String(nav.prevId)),
    createElement('span', { 'data-testid': 'next' }, String(nav.nextId)),
    createElement('span', { 'data-testid': 'path' }, location.pathname),
    createElement('span', { 'data-testid': 'from' }, String((location.state as { from?: string } | null)?.from ?? '')),
    createElement(
      'button',
      { type: 'button', onClick: () => { nav.goToNeighbour(3); } },
      'go-next',
    ),
  );
}

function renderProbe(props: ProbeProps): void {
  const entry = { pathname: '/admin/crm/companies/2', state: props.ids ? { from: props.from, allIds: props.ids } : null };
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [entry] }, children);

  render(createElement(Probe, props), { wrapper });
}

describe('useDetailPageNav', () => {
  it('uses the default back route without location state', () => {
    renderProbe({ currentId: 2, ids: null });

    expect(screen.getByTestId('back').textContent).toBe('/admin/crm/companies');
    expect(screen.getByTestId('prev').textContent).toBe('null');
    expect(screen.getByTestId('next').textContent).toBe('null');
  });

  it('derives both neighbours for a middle id', () => {
    renderProbe({ currentId: 2, ids: [1, 2, 3], from: '/admin/crm/companies?q=x' });

    expect(screen.getByTestId('back').textContent).toBe('/admin/crm/companies?q=x');
    expect(screen.getByTestId('prev').textContent).toBe('1');
    expect(screen.getByTestId('next').textContent).toBe('3');
  });

  it('has no previous id for the first entry', () => {
    renderProbe({ currentId: 2, ids: [2, 3] });

    expect(screen.getByTestId('prev').textContent).toBe('null');
    expect(screen.getByTestId('next').textContent).toBe('3');
  });

  it('has no next id for the last entry', () => {
    renderProbe({ currentId: 2, ids: [1, 2] });

    expect(screen.getByTestId('prev').textContent).toBe('1');
    expect(screen.getByTestId('next').textContent).toBe('null');
  });

  it('supports a custom placeholder and slug ids', () => {
    renderProbe({
      currentId: 'b',
      ids: ['a', 'b', 'c'],
      detailPath: '/portfolio/:slug',
      paramName: ':slug',
    });

    expect(screen.getByTestId('prev').textContent).toBe('a');
    expect(screen.getByTestId('next').textContent).toBe('c');
  });

  it('navigates to a neighbour while preserving the list context', () => {
    renderProbe({ currentId: 2, ids: [1, 2, 3], from: '/admin/crm/companies' });

    fireEvent.click(screen.getByRole('button', { name: 'go-next' }));

    expect(screen.getByTestId('path').textContent).toBe('/admin/crm/companies/3');
    expect(screen.getByTestId('from').textContent).toBe('/admin/crm/companies');
  });
});
