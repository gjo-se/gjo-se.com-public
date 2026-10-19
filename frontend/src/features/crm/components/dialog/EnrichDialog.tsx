/**
 * EnrichDialog – Dialog for enriching a person via Hunter.io.
 *
 * Collects first_name, last_name, and company_domain,
 * then calls enrichPerson() to create and enrich the person.
 */
import { useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import { enrichPerson } from '@src/lib/api/crm';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';


export interface EnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful enrichment to reload the table. */
  onEnriched: () => void;
}

/** Dialog that enriches a person via name + company domain. */
export default function EnrichDialog({ open, onOpenChange, onEnriched }: EnrichDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const d = domain.trim();

    if (!fn || !ln || !d) {
      setError('Vorname, Nachname und Domain sind erforderlich.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await enrichPerson({ first_name: fn, last_name: ln, company_domain: d });
      setFirstName('');
      setLastName('');
      setDomain('');
      onOpenChange(false);
      onEnriched();
    } catch (e) {
      showErrorToast(`Enrichment fehlgeschlagen: ${extractApiError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFirstName('');
      setLastName('');
      setDomain('');
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kontaktdaten besorgen</DialogTitle>
          <DialogDescription>
            Name und Firmen-Domain eingeben, um Kontaktdaten via Hunter.io zu recherchieren.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Text as="label" size="sm" weight="medium">
              Vorname
            </Text>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Max"
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Text as="label" size="sm" weight="medium">
              Nachname
            </Text>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Mustermann"
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Text as="label" size="sm" weight="medium">
              Firmen-Domain
            </Text>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              disabled={saving}
            />
          </div>
          {error && <Text color="error" size="sm">{error}</Text>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Suche…' : 'Kontaktdaten besorgen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
