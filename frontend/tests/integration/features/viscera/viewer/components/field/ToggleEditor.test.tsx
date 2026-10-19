import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToggleEditor } from '@src/features/viscera/viewer/components/field/ToggleEditor';

describe('ToggleEditor', () => {
  it('renders the current checkbox state', () => {
    render(
      <ToggleEditor
        value
        field="external"
        objectId="backend"
        onSave={vi.fn().mockResolvedValue({ success: true })}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Externes System' })).toBeChecked();
  });

  it('saves the toggled value immediately', () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(
      <ToggleEditor value={false} field="external" objectId="backend" onSave={onSave} />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Externes System' }));

    expect(onSave).toHaveBeenCalledWith('backend', 'external', true);
  });
});
