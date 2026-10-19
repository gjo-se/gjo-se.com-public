import { cva } from 'class-variance-authority';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';

import Command from '@src/components/primitives/Command/Command';
import CommandEmpty from '@src/components/primitives/Command/CommandEmpty';
import CommandGroup from '@src/components/primitives/Command/CommandGroup';
import CommandInput from '@src/components/primitives/Command/CommandInput';
import CommandItem from '@src/components/primitives/Command/CommandItem';
import CommandList from '@src/components/primitives/Command/CommandList';
import CommandSeparator from '@src/components/primitives/Command/CommandSeparator';
import Text from '@src/components/primitives/Text/Text';
import { Dialog, DialogContent } from '@src/components/vendor/shadcn/dialog';
import { routeConfig } from '@src/router.config';

import VSCodeLink from '../../../shared/VSCodeLink';
import { useSearch } from '../../hooks/useSearch';

import type { SearchResult } from '../../hooks/useSearch';

// ── Icons & Labels ───────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  system: '\u2B21',
  container: '\u{1F4E6}',
  component: '\u2699',
  adr: '\u{1F4DD}',
  flow: '\u{1F504}',
};

const TYPE_LABELS: Record<string, string> = {
  system: 'Systems',
  container: 'Containers',
  component: 'Components',
  adr: 'ADRs',
  flow: 'Flows',
};

const TYPE_ORDER = ['system', 'container', 'component', 'adr', 'flow'] as const;

const itemRowVariants = cva('flex w-full items-center justify-between gap-2');
const itemLeadingVariants = cva('flex min-w-0 items-center gap-2');
const itemTextVariants = cva('min-w-0 flex-1');
const truncateVariants = cva('truncate');

// ── Props ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * Command palette overlay with fuse.js fuzzy search over architecture elements.
 *
 * Renders a modal dialog (base-ui) wrapping cmdk's Command primitives.
 * Groups results by type (Systems, Containers, Components, ADRs, Flows).
 * Each result shows a type icon, name, description snippet, and a VS Code link.
 * Keyboard navigation via arrow keys and Enter. Close via Escape or backdrop click.
 */
export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { results, search, query } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      search('');
    }
  }, [open, search]);

  // Group results by type in defined order
  const groups = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach((r) => {
      const list = map.get(r.type);
      if (list) list.push(r);
      else map.set(r.type, [r]);
    });
    return TYPE_ORDER
      .filter((t) => map.has(t))
      .map((t) => ({ type: t, items: map.get(t)! }));
  }, [results]);

  // Navigation handlers
  const handleSelect = (result: SearchResult) => {
    onClose();
    switch (result.type) {
      case 'system':
        navigate(
          result.viewKey
            ? `/admin/viscera/views?view=${result.viewKey}`
            : '/admin/viscera/views',
        );
        break;
      case 'container':
      case 'component':
        navigate(
          result.viewKey
            ? `/admin/viscera/views?view=${result.viewKey}`
            : '/admin/viscera/views',
        );
        break;
      case 'adr':
        navigate(`${routeConfig.adminVisceraAdrDetail.path}/${result.id}`);
        break;
      case 'flow':
        navigate(`${routeConfig.adminVisceraFlows.path}?flow=${result.flowId ?? result.id}`);
        break;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-lg p-0 max-h-dialog-xl"
      >
        <Command shouldFilter={false} label="Viscera Search">
          <CommandInput
            placeholder="Systeme, Container, ADRs, Flows durchsuchen…"
            onValueChange={search}
            value={query}
          />
          <CommandList>
            <CommandEmpty>
              {query
                ? `Keine Ergebnisse für "${query}"`
                : 'Tippen zum Suchen…'}
            </CommandEmpty>

            {groups.map((group) => (
              <CommandGroup key={group.type} heading={TYPE_LABELS[group.type] ?? group.type}>
                {group.items.map((item) => (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <div className={itemRowVariants()}>
                      <div className={itemLeadingVariants()}>
                        <div className="shrink-0" aria-hidden="true">
                          <Text as="span" size="md">
                            {TYPE_ICONS[item.type]}
                          </Text>
                        </div>
                        <div className={itemTextVariants()}>
                          <div className={truncateVariants()}>
                            <Text as="span" size="sm" weight="medium">
                              {item.name}
                            </Text>
                          </div>
                          {item.description && (
                            <div className={truncateVariants()}>
                              <Text as="span" size="xs" color="muted">
                                {item.description}
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <VSCodeLink
                          path={item.sourcePath}
                          label=""
                          type={item.type === 'adr' ? 'adr' : 'yaml'}
                        />
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>

          {query && results.length > 0 && (
            <>
              <CommandSeparator />
              <div className="px-3 py-2">
                <Text as="span" size="xs" color="muted">
                  {results.length} Ergebnisse für &quot;{query}&quot;
                </Text>
              </div>
            </>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
}
