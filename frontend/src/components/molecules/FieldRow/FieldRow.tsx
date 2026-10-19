import Text from '@src/components/primitives/Text';

interface FieldRowProps {
  label: string;
  value: string;
}

/** Compact `Label: value` row used in the model detail grid. */
export default function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex gap-2">
      <Text size="sm" color="muted" as="span">{label}:</Text>
      <Text size="sm" as="span">{value}</Text>
    </div>
  );
}
