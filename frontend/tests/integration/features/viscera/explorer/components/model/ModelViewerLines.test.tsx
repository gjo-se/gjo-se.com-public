import { fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ModelViewerLines from '@src/features/viscera/explorer/components/model/ModelViewerLines';

import type { EdgeLine, NormalizedModelObject } from '@src/features/viscera/explorer/utils/modelViewerTypes';

const OBJECTS: NormalizedModelObject[] = [
  { id: 'a', name: 'A', type: 'system', edgesCount: 1, hasChildren: false },
  { id: 'b', name: 'B', type: 'system', edgesCount: 1, hasChildren: false },
];

const EDGES: EdgeLine[] = [
  { from: 'a', to: 'b' },
  { from: 'a', to: 'missing' },
];

function Harness({ onEdgeClick }: { onEdgeClick: (from: string, to: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={containerRef} style={{ position: 'relative', width: 600, height: 400 }}>
      <ModelViewerLines
        containerRef={containerRef}
        objects={OBJECTS}
        edges={EDGES}
        onEdgeClick={onEdgeClick}
      />
      <div data-object-id="a" style={{ position: 'absolute', left: 10, top: 10, width: 100, height: 50 }} />
      <div data-object-id="b" style={{ position: 'absolute', left: 300, top: 200, width: 100, height: 50 }} />
    </div>
  );
}

describe('ModelViewerLines', () => {
  it('draws one visible line per resolvable edge', () => {
    const { container } = render(<Harness onEdgeClick={vi.fn()} />);

    expect(container.querySelectorAll('line[stroke="#94a3b8"]')).toHaveLength(1);
  });

  it('ignores edges that reference unknown objects', () => {
    const { container } = render(<Harness onEdgeClick={vi.fn()} />);

    expect(container.querySelectorAll('line[stroke="transparent"]')).toHaveLength(1);
  });

  it('reports the edge endpoints on hit-area click', () => {
    const onEdgeClick = vi.fn();
    const { container } = render(<Harness onEdgeClick={onEdgeClick} />);

    const hitArea = container.querySelector('line[stroke="transparent"]');
    expect(hitArea).not.toBeNull();
    if (hitArea) {
      fireEvent.click(hitArea);
    }

    expect(onEdgeClick).toHaveBeenCalledWith('a', 'b');
  });
});
