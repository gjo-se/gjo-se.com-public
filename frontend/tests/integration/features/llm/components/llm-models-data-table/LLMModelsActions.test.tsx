import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LLMModelsActions from '@src/features/llm/components/llm-models-data-table/LLMModelsActions';

const syncResult = {
  providers_upserted: 2,
  models_upserted: 150,
  snapshots_created: 300,
};

describe('LLMModelsActions', () => {
  it('renders no toast trigger when there is no sync result', () => {
    const onClearSyncResult = vi.fn();
    render(<LLMModelsActions syncResult={null} onClearSyncResult={onClearSyncResult} />);

    expect(onClearSyncResult).not.toHaveBeenCalled();
  });

  it('clears the sync result after reporting it', async () => {
    const onClearSyncResult = vi.fn();
    const { rerender } = render(
      <LLMModelsActions syncResult={null} onClearSyncResult={onClearSyncResult} />,
    );

    rerender(<LLMModelsActions syncResult={syncResult} onClearSyncResult={onClearSyncResult} />);

    await waitFor(() => expect(onClearSyncResult).toHaveBeenCalledTimes(1));
  });

  it('does not clear the same sync result twice', async () => {
    const onClearSyncResult = vi.fn();
    const { rerender } = render(
      <LLMModelsActions syncResult={null} onClearSyncResult={onClearSyncResult} />,
    );

    rerender(<LLMModelsActions syncResult={syncResult} onClearSyncResult={onClearSyncResult} />);
    await waitFor(() => expect(onClearSyncResult).toHaveBeenCalledTimes(1));

    rerender(<LLMModelsActions syncResult={syncResult} onClearSyncResult={onClearSyncResult} />);

    expect(onClearSyncResult).toHaveBeenCalledTimes(1);
  });
});
