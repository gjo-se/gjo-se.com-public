import { cva } from 'class-variance-authority';

import Text from '@src/components/primitives/Text/Text';

const errorBoxVariants = cva(
  'rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950',
);

interface DialogErrorTextProps {
  /** Server error message; renders nothing when null/empty. */
  error: string | null | undefined
}

/** Red bordered error banner shared by the viscera create dialogs. */
export default function DialogErrorText({ error }: DialogErrorTextProps) {
  if (!error) return null;
  return (
    <div className={errorBoxVariants()}>
      <Text size="sm" color="error">
        {error}
      </Text>
    </div>
  );
}
