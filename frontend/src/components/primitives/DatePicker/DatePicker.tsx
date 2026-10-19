import { Button, Group, Popover, Stack } from '@mantine/core';
import { DatePicker as MantineDatePickerBase } from '@mantine/dates';
import { useCallback, useState } from 'react';

import { formatRange } from '@src/lib/formatDate';
import { DATE_PRESETS } from '@src/locales/de/date';

import type { DatePickerProps } from './DatePicker.interface';

/**
 * DatePicker — Date range picker powered by @mantine/dates.
 *
 * Encapsulates Mantine's DatePicker with a presets sidebar and
 * a popover trigger. The consumer sees only the interface —
 * the underlying library is an implementation detail.
 *
 * @example
 * <DatePicker
 *   from={dateFrom}
 *   to={dateTo}
 *   onFromChange={applyCustomFrom}
 *   onToChange={applyCustomTo}
 *   onPreset={applyDatePreset}
 *   onClear={clearDateFilter}
 * />
 */
export default function DatePicker({
  from,
  to,
  onFromChange,
  onToChange,
  onPreset,
  onClear,
}: DatePickerProps) {
  const [opened, setOpened] = useState(false);
  const hasRange = !!(from || to);

  const handlePreset = useCallback(
    (key: string) => {
      onPreset(key);
      setOpened(false);
    },
    [onPreset],
  );

  const handleClear = useCallback(() => {
    onClear();
    setOpened(false);
  }, [onClear]);

  const handleRangeChange = useCallback(
    (value: [string | null, string | null]) => {
      const fmt = (d: string | null): string => {
        if (!d) return '';
        const date = (d as unknown) instanceof Date ? (d as unknown as Date) : new Date(d);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      };
      const fromStr = fmt(value[0]);
      const toStr = fmt(value[1]);
      if (fromStr !== (from || '')) {
        onFromChange(fromStr || '');
      }
      if (toStr !== (to || '')) {
        onToChange(toStr || '');
      }
    },
    [from, to, onFromChange, onToChange],
  );

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md">
      <Popover.Target>
        <Button variant="outline" onClick={() => setOpened((o) => !o)}>
          {formatRange(from, to)}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group align="flex-start" wrap="nowrap" gap={0}>
          <Stack
            gap="xs"
            py="md"
            px="sm"
            style={{
              minWidth: 150,
              borderRight: '1px solid var(--mantine-color-default-border)',
            }}
          >
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.key}
                variant="subtle"
                size="sm"
                fullWidth
                onClick={() => handlePreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
            {hasRange && (
              <Button
                variant="subtle"
                size="sm"
                color="red"
                fullWidth
                onClick={handleClear}
              >
                Zurücksetzen
              </Button>
            )}
          </Stack>
          <MantineDatePickerBase
            type="range"
            value={[from || null, to || null]}
            onChange={handleRangeChange}
            numberOfColumns={2}
            highlightToday
          />
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
