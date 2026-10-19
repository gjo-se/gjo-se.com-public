import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import InfoPanel from '@src/features/viscera/viewer/components/panel/InfoPanel';

const EDGES = [
  { from: 'frontend', to: 'backend', description: 'POST /apply', technology: 'HTTP' },
];

describe('InfoPanel', () => {
  it('renders container metadata, description and tags', () => {
    render(
      <InfoPanel
        containerName="FastAPI App"
        technologyName="FastAPI"
        description="Die Anwendung."
        tags={['Backend', 'API']}
      />,
    );

    expect(screen.getByText('FastAPI App')).toBeInTheDocument();
    expect(screen.getByText('Die Anwendung.')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getAllByText('FastAPI').length).toBeGreaterThan(0);
  });

  it('lists related edges in a table', () => {
    render(
      <InfoPanel
        containerName="FastAPI App"
        technologyName="FastAPI"
        description=""
        edges={EDGES}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'From → To' })).toBeInTheDocument();
    expect(screen.getByText('frontend → backend')).toBeInTheDocument();
    expect(screen.getByText('POST /apply')).toBeInTheDocument();
    expect(screen.getByText('HTTP')).toBeInTheDocument();
  });

  it('copies the description to the clipboard and confirms it', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);

    render(
      <InfoPanel
        containerName="FastAPI App"
        technologyName="FastAPI"
        description="Kopier mich"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy for Kilo' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Kopier mich'));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('omits optional sections when no tags or edges are present', () => {
    render(
      <InfoPanel containerName="FastAPI App" technologyName="FastAPI" description="" />,
    );

    expect(screen.queryByText('Tags')).toBeNull();
    expect(screen.queryByText('Edges')).toBeNull();
  });
});
