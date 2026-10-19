import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import TagUsageSheet from '@src/features/core/components/tag-usage-sheet/TagUsageSheet';

const tag = {
  id: 1,
  name: 'Backend',
  slug: 'backend',
  category: 'domain',
  color_token: 'blue',
  description: null,
  sort_order: 1,
  usage_count: 2,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function renderSheet(open: boolean) {
  return render(
    <MantineProvider>
      <TagUsageSheet tag={tag} open={open} onClose={vi.fn()} />
    </MantineProvider>,
  );
}

describe('TagUsageSheet', () => {
  it('renders nothing when no tag is selected', () => {
    render(
      <MantineProvider>
        <TagUsageSheet tag={null} open={false} onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.queryByText(/Verwendung:/)).not.toBeInTheDocument();
  });

  it('shows the tag usage breakdown from the API', async () => {
    renderSheet(true);

    expect(await screen.findByText('Verwendung: Backend')).toBeInTheDocument();
    expect(screen.getByText('Entitäten, die diesen Tag verwenden')).toBeInTheDocument();
  });

  it('renders the total usage count in the footer', async () => {
    renderSheet(true);

    expect(await screen.findByText('Gesamt: 2 Verwendungen')).toBeInTheDocument();
  });
});
