import { Textarea } from '@src/components/vendor/shadcn/textarea';

import FieldLabel from './FieldLabel';

interface DescriptionFieldProps {
  /** id linking the textarea and its label. */
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}

/** Labelled, optional description textarea shared by the viscera create dialogs. */
export default function DescriptionField({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
}: DescriptionFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label="Beschreibung" optional />
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
      />
    </div>
  );
}
