import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScanCodeToast from '@src/features/viscera/viewer/components/dialog/ScanCodeToast';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Activity, ScanCodeState } from '@src/features/viscera/viewer/hooks/useScanCode';

const ACTIVITIES: Activity[] = [
  { name: 'docker_compose', label: 'DockerComposeParser', status: 'done' },
  { name: 'deterministic_processor', label: 'DeterministicProcessor', status: 'running' },
  { name: 'llm_enrichment', label: 'LLM Enrichment', status: 'pending' },
];

function makeState(overrides: Partial<ScanCodeState> = {}): ScanCodeState {
  return {
    status: 'running',
    activities: ACTIVITIES,
    result: null,
    error: null,
    elapsed: 65,
    ...overrides,
  };
}

describe('ScanCodeToast', () => {
  it('renders nothing while idle', () => {
    const { container } = renderWithWorkspace(
      <ScanCodeToast state={makeState({ status: 'idle' })} onClose={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows progress, activities and elapsed time while running', () => {
    renderWithWorkspace(<ScanCodeToast state={makeState()} onClose={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Scan läuft…')).toBeInTheDocument();
    expect(screen.getByText('DockerComposeParser')).toBeInTheDocument();
    expect(screen.getByText('DeterministicProcessor')).toBeInTheDocument();
    expect(screen.getByText('LLM Enrichment')).toBeInTheDocument();
    expect(screen.getByText('Läuft seit 1m 5s')).toBeInTheDocument();
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    renderWithWorkspace(<ScanCodeToast state={makeState()} onClose={onClose} />);

    fireEvent.click(screen.getByTitle('Schließen'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reports a failed run with its activity error', () => {
    renderWithWorkspace(
      <ScanCodeToast
        state={makeState({
          status: 'failed',
          elapsed: 12,
          error: 'Restate nicht erreichbar',
          activities: [
            { name: 'docker_compose', label: 'DockerComposeParser', status: 'failed', error: 'Exit 1' },
          ],
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Scan fehlgeschlagen')).toBeInTheDocument();
    expect(screen.getByText('Exit 1')).toBeInTheDocument();
    expect(screen.getByText('Restate nicht erreichbar')).toBeInTheDocument();
    expect(screen.getByText('Fehler nach 12s')).toBeInTheDocument();
  });

  it('summarises the result and links to the editor when completed', () => {
    renderWithWorkspace(
      <ScanCodeToast
        state={makeState({
          status: 'completed',
          elapsed: 30,
          result: { objects_new: 2, objects_updated: 3, objects_missing: 1 },
        })}
        onClose={vi.fn()}
        currentViewKey="SystemContext"
      />,
    );

    expect(screen.getByText('Scan abgeschlossen')).toBeInTheDocument();
    expect(screen.getByText('2 neu')).toBeInTheDocument();
    expect(screen.getByText('3 geändert')).toBeInTheDocument();
    expect(screen.getByText('1 fehlt')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zum Editor →' })).toHaveAttribute(
      'href',
      '/admin/architecture-viewer/editor?view=SystemContext',
    );
  });
});
