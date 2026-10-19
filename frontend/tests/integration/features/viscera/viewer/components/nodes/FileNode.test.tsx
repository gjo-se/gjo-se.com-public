import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import FileNode from '@src/features/viscera/viewer/components/nodes/FileNode';

import type { ComponentProps } from 'react';

type FileNodeProps = ComponentProps<typeof FileNode>;

function renderFileNode(data: Partial<FileNodeProps['data']> = {}) {
  const props = {
    id: 'backend.api',
    type: 'file',
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selected: false,
    data: {
      name: 'backend.api',
      fileName: 'api.py',
      path: 'backend/api.py',
      ...data,
    },
  } as unknown as FileNodeProps;
  render(
    <ReactFlowProvider>
      <FileNode {...props} />
    </ReactFlowProvider>,
  );
  return props;
}

describe('FileNode', () => {
  it('renders the file name, description and path tooltip', () => {
    renderFileNode({ description: 'API-Router' });

    expect(screen.getByText('api.py')).toBeInTheDocument();
    expect(screen.getByText('API-Router')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('title', 'backend/api.py');
  });

  it('copies the path on click', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderFileNode();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('backend/api.py'));
  });

  it('opens the module menu on right click and forwards the action', () => {
    const onModuleFilter = vi.fn();
    renderFileNode({ onModuleFilter, collapsed: true });

    fireEvent.contextMenu(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: '◎ Fokus' }));

    expect(onModuleFilter).toHaveBeenCalledWith('focus', 'backend.api');
  });

  it('renders nothing when hidden', () => {
    renderFileNode({ hidden: true });

    expect(screen.queryByText('api.py')).toBeNull();
  });
});
