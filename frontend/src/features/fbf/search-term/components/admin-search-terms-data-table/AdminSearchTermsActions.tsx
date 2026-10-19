/**
 * AdminSearchTermsActions – Create form.
 */

import Button from '@src/components/primitives/Button';
import Input from '@src/components/primitives/Input';
import Separator from '@src/components/primitives/Separator';
import Text from '@src/components/primitives/Text';
import { useSimpleForm } from '@src/hooks/useSimpleForm';

interface Props {
  handleCreate: (name: string) => Promise<{ error?: string }>
}

interface SearchTermForm {
  name: string
}

/** Inline form to create a new search term and trigger the refresh action. */
export default function AdminSearchTermsActions({ handleCreate }: Props) {
  const { form, setForm, loading, error, success, handleSubmit } = useSimpleForm<SearchTermForm>({
    initialForm: { name: '' },
    submitFn: async (f) => {
      const result = await handleCreate(f.name.trim());
      if (result.error) throw new Error(result.error);
      return { message: 'Suchbegriff angelegt.' };
    },
    validate: (f) => {
      if (!f.name.trim()) return 'Name ist erforderlich.';
      return null;
    },
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          maxLength={255}
          placeholder="z. B. AI Engineer"
        />
      </div>
      <Button submit disabled={loading || form.name.trim().length === 0}>
        Anlegen
      </Button>
      {error && (
        <div className="basis-full">
          <Text size="sm" color="error">{error}</Text>
        </div>
      )}
      {success && (
        <div className="basis-full">
          <Text size="sm" color="success">{success}</Text>
        </div>
      )}
      <Separator spacing="none" />
    </form>
  );
}
