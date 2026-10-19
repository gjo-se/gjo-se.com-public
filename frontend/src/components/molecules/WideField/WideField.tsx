import Text from '@src/components/primitives/Text';

interface WideFieldProps {
  label: string;
  value: string;
}

/** Full-width `Label` + monospace value block for the model detail view. */
export default function WideField({ label, value }: WideFieldProps) {
  return (
    <div className="space-y-1">
      <Text size="sm" color="muted">{label}:</Text>
      <pre className="max-w-full whitespace-pre-wrap break-all rounded bg-gray-50 p-3 text-xs font-mono text-gray-800 dark:bg-gray-800 dark:text-gray-200">
        {value}
      </pre>
    </div>
  );
}
