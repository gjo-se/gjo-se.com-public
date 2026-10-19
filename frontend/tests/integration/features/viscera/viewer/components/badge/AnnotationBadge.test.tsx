import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AnnotationBadge from '@src/features/viscera/viewer/components/badge/AnnotationBadge';

import type { Annotation } from '@src/features/viscera/core/workspaceSchema';

const ANNOTATIONS: Annotation[] = [
  { text: 'Erste Notiz', author: 'Greg', date: '2026-01-01' },
  { text: 'Zweite Notiz', author: 'Anna', date: '2026-01-02' },
];

function renderBadge(annotations: Annotation[], onAdd = vi.fn()) {
  return render(
    <svg>
      <AnnotationBadge
        annotations={annotations}
        onAdd={onAdd}
        cardWidth={280}
        cardHeight={180}
      />
    </svg>,
  );
}

describe('AnnotationBadge', () => {
  it('is hidden without annotations', () => {
    const { container } = renderBadge([]);

    expect(container.querySelector('g')).toBeNull();
  });

  it('shows the annotation count and last-author tooltip', () => {
    const { container } = renderBadge(ANNOTATIONS);

    expect(screen.getByText('💬 2')).toBeInTheDocument();
    expect(container.querySelector('title')).toHaveTextContent('Anna: Zweite Notiz');
  });

  it('adds a trimmed annotation through the portal editor', () => {
    const onAdd = vi.fn();
    renderBadge(ANNOTATIONS, onAdd);

    fireEvent.click(screen.getByText('💬 2'));
    const textarea = screen.getByPlaceholderText('Kommentar eingeben...');
    fireEvent.change(textarea, { target: { value: '  Neue Notiz  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onAdd).toHaveBeenCalledWith('Neue Notiz');
  });

  it('does not submit an empty annotation', () => {
    const onAdd = vi.fn();
    renderBadge(ANNOTATIONS, onAdd);

    fireEvent.click(screen.getByText('💬 2'));

    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
