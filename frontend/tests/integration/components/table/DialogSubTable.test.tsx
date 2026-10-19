import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { DialogSubTable } from '@src/components/table/DialogSubTable';

interface Row {
  key: string;
  label: string;
}

function createRow(): Row {
  return { key: 'new', label: '' };
}

function renderRow(
  item: Row,
  onFieldChange: (key: string, field: string, value: string) => void,
  onDelete: (key: string) => void,
) {
  return (
    <tr key={item.key}>
      <td>{item.label || 'Neue Zeile'}</td>
      <td>
        <button type="button" onClick={() => onFieldChange(item.key, 'label', 'Geändert')}>
          Ändern
        </button>
        <button type="button" onClick={() => onDelete(item.key)}>
          Entfernen
        </button>
      </td>
    </tr>
  );
}

describe('DialogSubTable', () => {
  it('renders title, subtitle and the rows', () => {
    render(
      <DialogSubTable
        title="Erfahrungen"
        subtitle="Sortierbar per Drag & Drop"
        items={[{ key: 'a', label: 'Erste' }]}
        columns={<tr><th>Label</th><th>Aktionen</th></tr>}
        colSpan={2}
        emptyText="Keine Zeilen."
        addLabel="Zeile hinzufügen"
        createRow={createRow}
        locale="de"
        onChange={vi.fn()}
        setField={(item, _locale, field, value) => ({ ...item, [field]: value })}
        renderRow={renderRow}
      />,
    );

    expect(screen.getByText('Erfahrungen')).toBeVisible();
    expect(screen.getByText('Sortierbar per Drag & Drop')).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Erste' })).toBeVisible();
  });

  it('shows the empty state', () => {
    render(
      <DialogSubTable
        title="Erfahrungen"
        subtitle="Untertitel"
        items={[]}
        columns={<tr><th>Label</th></tr>}
        colSpan={1}
        emptyText="Keine Zeilen."
        addLabel="Zeile hinzufügen"
        createRow={createRow}
        locale="de"
        onChange={vi.fn()}
        setField={(item) => item}
        renderRow={renderRow}
      />,
    );

    expect(screen.getByText('Keine Zeilen.')).toBeVisible();
  });

  it('appends a new row', async () => {
    const onChange = vi.fn();
    render(
      <DialogSubTable
        title="Erfahrungen"
        subtitle="Untertitel"
        items={[{ key: 'a', label: 'Erste' }]}
        columns={<tr><th>Label</th></tr>}
        colSpan={1}
        emptyText="Keine Zeilen."
        addLabel="Zeile hinzufügen"
        createRow={createRow}
        locale="de"
        onChange={onChange}
        setField={(item) => item}
        renderRow={renderRow}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Zeile hinzufügen' }));

    expect(onChange).toHaveBeenCalledWith([{ key: 'a', label: 'Erste' }, { key: 'new', label: '' }]);
  });

  it('updates a field on the matching row only', async () => {
    const onChange = vi.fn();
    render(
      <DialogSubTable
        title="Erfahrungen"
        subtitle="Untertitel"
        items={[{ key: 'a', label: 'Erste' }, { key: 'b', label: 'Zweite' }]}
        columns={<tr><th>Label</th></tr>}
        colSpan={1}
        emptyText="Keine Zeilen."
        addLabel="Zeile hinzufügen"
        createRow={createRow}
        locale="de"
        onChange={onChange}
        setField={(item, _locale, field, value) => ({ ...item, [field]: value })}
        renderRow={renderRow}
      />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: 'Ändern' })[0]!);

    expect(onChange).toHaveBeenCalledWith([
      { key: 'a', label: 'Geändert' },
      { key: 'b', label: 'Zweite' },
    ]);
  });

  it('removes the matching row', async () => {
    const onChange = vi.fn();
    render(
      <DialogSubTable
        title="Erfahrungen"
        subtitle="Untertitel"
        items={[{ key: 'a', label: 'Erste' }, { key: 'b', label: 'Zweite' }]}
        columns={<tr><th>Label</th></tr>}
        colSpan={1}
        emptyText="Keine Zeilen."
        addLabel="Zeile hinzufügen"
        createRow={createRow}
        locale="de"
        onChange={onChange}
        setField={(item) => item}
        renderRow={renderRow}
      />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: 'Entfernen' })[1]!);

    expect(onChange).toHaveBeenCalledWith([{ key: 'a', label: 'Erste' }]);
  });
});
