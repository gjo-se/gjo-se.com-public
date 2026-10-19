/**
 * SkillFilter – Multi-select Combobox with chip badges for skill filtering.
 *
 * Selected skills render as removable Chips inside the input field
 * (max 3 visible + "+N" overflow). Uses the base-ui Combobox primitive
 * consistent with the TagAssignCell pattern.
 */

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { useCallback, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Checkbox from '@src/components/primitives/Checkbox';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Text from '@src/components/primitives/Text';

import { MAX_VISIBLE } from './SkillFilter.utils';
import { skillFilterChipVariants, skillFilterInputVariants, skillFilterOverflowVariants } from './SkillFilter.variants';

export interface SkillFilterProps {
  /** All available skill names to choose from. */
  allSkills: string[]
  /** Currently selected skill names. */
  selectedSkills: string[]
  /** Callback when selection changes. */
  onChange: (skills: string[]) => void
  /** Placeholder text when nothing is selected. */
  placeholder?: string
}

/**
 * Renders a Combobox for multi-select skill filtering with chips inside the input.
 *
 * @example
 * <SkillFilter
 *   allSkills={['Azure', 'Kubernetes', 'Terraform', 'Docker']}
 *   selectedSkills={['Azure', 'Kubernetes']}
 *   onChange={setSelectedSkills}
 * />
 */
export default function SkillFilter({
  allSkills,
  selectedSkills,
  onChange,
  placeholder = 'Skills filtern…',
}: SkillFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selectedSkills), [selectedSkills]);

  const filtered = searchQuery.trim()
    ? allSkills.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSkills;

  const handleToggle = useCallback(
    (skill: string) => {
      const next = selectedSet.has(skill)
        ? selectedSkills.filter((s) => s !== skill)
        : [...selectedSkills, skill];
      onChange(next);
    },
    [selectedSet, selectedSkills, onChange],
  );

  const handleRemove = useCallback(
    (skill: string) => {
      onChange(selectedSkills.filter((s) => s !== skill));
    },
    [selectedSkills, onChange],
  );

  const visibleTags = selectedSkills.slice(0, MAX_VISIBLE);
  const overflowCount = selectedSkills.length - MAX_VISIBLE;

  const inputPlaceholder = selectedSkills.length === 0 ? placeholder : undefined;

  return (
    <div className="relative">
      <Combobox
        {...({ value: '', onValueChange: () => {} } as Record<string, unknown>)}
      >
        {/* Chips-in-input wrapper */}
        <div className={skillFilterInputVariants()}>
          {visibleTags.map((skill) => (
            <div
              key={skill}
              className={skillFilterChipVariants()}
            >
              <Text as="span" size="xs">{skill}</Text>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(skill);
                }}
                variant="chip-remove"
              >
                ×
              </Button>
            </div>
          ))}
          {overflowCount > 0 && (
            <div className={skillFilterOverflowVariants()}>
              <Text as="span" size="xs" color="muted">
                +{overflowCount}
              </Text>
            </div>
          )}
          <ComboboxPrimitive.Input
            data-slot="combobox-input"
            className="min-w-20 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
            placeholder={inputPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          />
        </div>
        <ComboboxContent>
          <ComboboxList>
            {filtered.map((skill) => (
              <ComboboxItem
                key={skill}
                {...({ value: skill } as Record<string, unknown>)}
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={selectedSet.has(skill)}
                    onChange={() => handleToggle(skill)}
                  />
                  <Text as="span">{skill}</Text>
                </label>
              </ComboboxItem>
            ))}
          </ComboboxList>
          {filtered.length === 0 && searchQuery.trim() && (
            <ComboboxEmpty>Keine Skills</ComboboxEmpty>
          )}
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export type { SkillFilterVariants } from './SkillFilter.variants';
