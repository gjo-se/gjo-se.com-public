import Text from '@src/components/primitives/Text/Text';

interface FieldLabelProps {
  /** Associates the label with a form control id. */
  htmlFor?: string
  /** Visible label text. */
  label: string
  /** Appends a muted "(optional)" hint. */
  optional?: boolean
}

/** Field label with an optional muted hint, shared by the viscera create dialogs. */
export default function FieldLabel({ htmlFor, label, optional = false }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor}>
      <Text as="span" size="sm" weight="semibold">
        {label}
      </Text>
      {optional && (
        <Text as="span" size="xs" color="muted">
          {' '}
          (optional)
        </Text>
      )}
    </label>
  );
}
