import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ForceGraph from '@src/components/charts/ForceGraph/ForceGraph';

const nodes = [
  { id: 'a', name: 'TypeScript', val: 2 },
  { id: 'b', name: 'React', val: 1 },
];
const links = [{ source: 'a', target: 'b', value: 2 }];

describe('ForceGraph', () => {
  it('renders the graph canvas for nodes and links', async () => {
    render(<ForceGraph nodes={nodes} links={links} />);

    await waitFor(() => {
      expect(document.querySelector('canvas')).not.toBeNull();
    });
  });

  it('renders the loading placeholder while the graph is loading', () => {
    const { container } = render(<ForceGraph nodes={nodes} links={links} loading />);

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders the error message when the graph failed to load', () => {
    render(
      <ForceGraph nodes={nodes} links={links} errorMessage="Graph nicht verfügbar" />,
    );

    expect(screen.getByText('Graph nicht verfügbar')).toBeVisible();
  });
});
