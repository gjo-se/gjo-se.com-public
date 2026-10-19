import { useRef } from 'react';

import Icon from '@src/components/primitives/Icon';
import Text from '@src/components/primitives/Text';

import { cn } from '../../../lib/utils';

import type { FileUploadProps } from './FileUpload.interface';

/** Renders a drag-and-drop file upload zone. */
export default function FileUpload({
  onChange,
  accept,
  multiple = false,
  disabled = false,
  label = 'Datei auswählen oder hierher ziehen',
  id,
  name,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (!disabled) inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'flex items-center gap-2 rounded-md border border-dashed border-border-heavy px-4 py-3 text-sm transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:border-primary hover:bg-primary-subtle-bg',
      )}
    >
      <Icon name="upload" variant="muted" shrink aria-hidden />
      <Text as="span" color="muted">{label}</Text>
      <input
        ref={inputRef}
        type="file"
        id={id}
        name={name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

export type { FileUploadProps } from './FileUpload.interface';
