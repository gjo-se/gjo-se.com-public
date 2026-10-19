import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';

import { cn } from '../../../lib/utils';

import { dropdownEmptyOptionVariants, dropdownPanelVariants } from './Dropdown.variants';

export interface DropdownItem {
  value: string
  label: string
}
export interface DropdownProps {
  items: DropdownItem[]
  selectedValue: string
  onSelect: (value: string) => void
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  disabled?: boolean
}

/**
 * Dropdown – Einheitliche Auswahlliste (ersetzt Select-Atom und Comboboxen).
 * Zwei Modi: simple (click-to-open) und searchable (type-to-filter).
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <Dropdown
 *   items={[{value:'a',label:'A'},{value:'b',label:'B'}]}
 *   selectedValue={v}
 *   onSelect={setV}
 * />
 *
 * @example
 * <Dropdown
 *   items={providers.map(p=>({value:p.id,label:p.name}))}
 *   selectedValue={selected}
 *   onSelect={setSelected}
 *   searchable
 *   searchPlaceholder="Provider suchen…"
 * />
 */
export default function Dropdown({
  items,
  selectedValue,
  onSelect,
  placeholder = 'Bitte wählen...',
  searchable = false,
  searchPlaceholder = 'Suchen...',
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!searchable || !filterText) return items;
    const q = filterText.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, filterText, searchable]);

  const selectedLabel = items.find((i) => i.value === selectedValue)?.label ?? '';

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterText('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      setIsOpen(false);
      setFilterText('');
      setActiveIndex(-1);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setIsOpen(true);
          setActiveIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1 >= filtered.length ? 0 : prev + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 < 0 ? filtered.length - 1 : prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && filtered[activeIndex]) {
            handleSelect(filtered[activeIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFilterText('');
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, activeIndex, filtered, handleSelect],
  );

  const handleClear = useCallback(() => {
    if (searchable) {
      onSelect('');
      setFilterText('');
    }
  }, [searchable, onSelect]);

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* ── Trigger ── */}
      {searchable ? (
        <div className="relative">
          <Input
            value={isOpen ? filterText : (selectedValue ? selectedLabel : '')}
            onChange={(e) => {
              setFilterText(e.target.value);
              setActiveIndex(0);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              setFilterText('');
              setActiveIndex(0);
            }}
            placeholder={searchPlaceholder}
            disabled={disabled}
            leftIcon="search"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
          />
          {selectedValue && !disabled && (
            <div className="absolute inset-y-0 right-1 flex items-center">
              <Button variant="ghost" size="xs" onClick={handleClear} aria-label="Auswahl zurücksetzen">
                <Icon name="x" size="xs" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Text as="span" size="sm">
            {selectedValue ? selectedLabel : placeholder}
          </Text>
          <Icon name="chevron-down" size="xs" shrink rotate={isOpen} aria-hidden />
        </Button>
      )}

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className={dropdownPanelVariants()}
        >
          {filtered.length === 0 ? (
            <div role="option" className={dropdownEmptyOptionVariants()}>
              {searchable ? 'Keine Ergebnisse' : 'Keine Optionen'}
            </div>
          ) : (
            filtered.map((item, index) => (
              <div
                key={item.value}
                role="option"
                aria-selected={item.value === selectedValue}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item.value)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm transition-colors',
                  index === activeIndex && 'bg-blue-100',
                  item.value === selectedValue && 'font-medium',
                  index !== activeIndex && 'hover:bg-blue-50',
                )}
              >
                {item.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export type { DropdownVariants } from './Dropdown.variants';
