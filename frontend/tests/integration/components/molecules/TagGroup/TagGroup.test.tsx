import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TagGroup from '@src/components/molecules/TagGroup/TagGroup';

describe('TagGroup', () => {
  it('renders one chip per tag', () => {
    render(<TagGroup tags={['React', 'TypeScript', 'Python']} />);

    expect(screen.getByText('React')).toBeVisible();
    expect(screen.getByText('TypeScript')).toBeVisible();
    expect(screen.getByText('Python')).toBeVisible();
  });

  it('renders nothing for an empty tag list', () => {
    const { container } = render(<TagGroup tags={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('reports the removed tag', async () => {
    const onRemove = vi.fn();
    render(<TagGroup tags={['React', 'TypeScript']} onRemove={onRemove} />);

    await userEvent.click(screen.getAllByRole('button', { name: '×' })[1]!);

    expect(onRemove).toHaveBeenCalledWith('TypeScript');
  });

  it('renders no remove controls without a handler', () => {
    render(<TagGroup tags={['React']} />);

    expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
  });
});
