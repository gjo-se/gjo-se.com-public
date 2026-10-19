/**
 * CompanySheet – Slide-over detail panel for a CRM Company.
 *
 * Shows the company's addresses and a placeholder for associated persons.
 * Addresses are loaded from the API when the sheet opens.
 */
import { useEffect, useState } from 'react';

import Text from '@src/components/primitives/Text';
import { fetchAddresses } from '@src/lib/api/crm';
import type { components } from '@src/lib/types.generated';
import { withAsyncState } from '@src/lib/withAsyncState';


/** Props for the CompanySheet slide-over panel. */
export interface CompanySheetProps {
  /** UUID of the company whose details are shown. */
  companyId: number;
  /** Company name for the sheet title. */
  companyName: string;
}

type CrmAddressOut = components['schemas']['AddressOut'];

/** Slide-over panel showing company addresses and associated persons. */
export default function CompanySheet({ companyId, companyName: _companyName }: CompanySheetProps) {
  const [addresses, setAddresses] = useState<CrmAddressOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await withAsyncState(
        setLoading,
        setError,
        () => fetchAddresses(companyId),
        'Fehler beim Laden der Adressen.',
      );
      if (!cancelled && data) setAddresses(data);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  return (
    <section className="flex flex-col gap-6">
      {/* Addresses section */}
      <section>
        <div className="mb-3">
          <Text variant="h3" as="h3">
            Adressen
          </Text>
        </div>
        {loading && <Text color="muted">Lade Adressen…</Text>}
        {error && <Text color="error">{error}</Text>}
        {!loading && !error && addresses.length === 0 && (
          <Text color="muted">Keine Adressen hinterlegt.</Text>
        )}
        {!loading &&
          !error &&
          addresses.length > 0 &&
          addresses.map((addr) => (
            <article key={addr.id} className="mb-2 rounded border p-3">
              {addr.label && (
                <div className="mb-1">
                  <Text as="p" weight="medium">
                    {addr.label}
                    {addr.is_primary && (
                      <Text as="span" color="muted" size="sm">
                        {' '}
                        (Standard)
                      </Text>
                    )}
                  </Text>
                </div>
              )}
              <Text as="p" size="sm" color="muted">
                {formatAddress(addr)}
              </Text>
            </article>
          ))}
      </section>

      {/* Associated persons placeholder */}
      <section>
        <div className="mb-3">
          <Text variant="h3" as="h3">
            Zugehörige Personen
          </Text>
        </div>
        <Text color="muted">Personen-Verknüpfungen folgen in einem späteren Ticket.</Text>
      </section>
    </section>
  );
}

/** Formats an address object into a single comma-separated string. */
function formatAddress(addr: CrmAddressOut): string {
  const parts = [addr.street, addr.zip, addr.city, addr.country].filter(Boolean);
  return parts.join(', ') || '\u2013';
}
