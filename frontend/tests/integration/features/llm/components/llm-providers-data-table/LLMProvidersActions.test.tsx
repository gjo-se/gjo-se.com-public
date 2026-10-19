import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LLMProvidersActions from '@src/features/llm/components/llm-providers-data-table/LLMProvidersActions';

describe('LLMProvidersActions', () => {
  it('triggers the OpenRouter sync', () => {
    const onSync = vi.fn().mockResolvedValue(undefined);
    render(<LLMProvidersActions syncing={false} onSync={onSync} />);

    fireEvent.click(screen.getByRole('button', { name: '🔄 OpenRouter Sync' }));

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('shows the running state and blocks another sync', () => {
    const onSync = vi.fn().mockResolvedValue(undefined);
    render(<LLMProvidersActions syncing={true} onSync={onSync} />);

    const button = screen.getByRole('button', { name: '🔄 Sync läuft…' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onSync).not.toHaveBeenCalled();
  });
});
