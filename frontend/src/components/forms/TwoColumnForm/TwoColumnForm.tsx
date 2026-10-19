import Button from '@src/components/primitives/Button';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';

import type { TwoColumnFormProps } from './TwoColumnForm.interface';

/** Renders a two-column form layout with save/cancel actions and loading/error states. */
export default function TwoColumnForm({
  formProps: { title, loading, saving, error, onSave, onCancel },
  children,
}: TwoColumnFormProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={onSave} noValidate className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Text variant="h1">{title}</Text>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          ← Zurück
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Text color="error">{error}</Text>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {children}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button variant="default" submit loading={saving}>
          {saving ? 'Speichert…' : 'Speichern'}
        </Button>
      </div>
    </form>
  );
}

export type { TwoColumnFormData } from './TwoColumnForm.types';
export type { TwoColumnFormProps } from './TwoColumnForm.interface';
