/**
 * ProjectEnrichDialog – Dialog for enriching project contacts.
 *
 * Two modes: "Automatisch (Hunter)" keeps the one-click Hunter run, while
 * "Manuell (ohne Hunter)" lets the user search/select an existing company and
 * person, or create them directly, then link them without a Hunter call.
 */
import Alert from '@src/components/primitives/Alert';
import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Link from '@src/components/primitives/Link';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { useContactEnrichment } from '@src/providers/contactEnrichment/useContactEnrichment';
import type { ContactEnrichMode } from '@src/providers/contactEnrichment/useContactEnrichment';
import { routeConfig } from '@src/router.config';

import ContactEntityPicker from './ContactEntityPicker';
import { DASH, displayName, hunterErrorMessage } from './ProjectEnrichDialog.utils';
import { enrichModeSwitchVariants, enrichResultPanelVariants } from './ProjectEnrichDialog.variants';

import type { CrmCompanyOut, CrmPersonOut } from './ProjectEnrichDialog.types';

export interface ProjectEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  companyName: string;
  contactName: string;
  /** Called after a successful enrichment (e.g. to refresh the link status). */
  onEnriched?: () => void;
}

/** Dialog that triggers the project enrichment pipeline. */
export default function ProjectEnrichDialog({
  open,
  onOpenChange,
  projectId,
  companyName,
  contactName,
  onEnriched,
}: ProjectEnrichDialogProps) {
  const {
    mode,
    setMode,
    companyQuery,
    onCompanyQueryChange,
    personQuery,
    onPersonQueryChange,
    companyResults,
    personResults,
    selectedCompany,
    selectCompany,
    selectedPerson,
    selectPerson,
    createCompanyFromQuery,
    createPersonFromQuery,
    loading,
    result,
    error,
    submit,
  } = useContactEnrichment(projectId, companyName, contactName, onEnriched);

  const setEnrichMode = (next: ContactEnrichMode) => setMode(next);
  const isManual = mode === 'manual';
  const hunterError = result?.enrichment_details?.hunter_error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kontaktdaten besorgen</DialogTitle>
          <DialogDescription>
            {isManual
              ? 'Vorhandene Firma/Person auswählen oder neu anlegen und ohne Hunter verknüpfen.'
              : 'Firma und Kontakt werden via Hunter.io angereichert und im CRM verknüpft.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className={enrichModeSwitchVariants()}>
            <Button variant={isManual ? 'ghost' : 'default'} size="xs" onClick={() => setEnrichMode('auto')}>
              Automatisch (Hunter)
            </Button>
            <Button variant={isManual ? 'default' : 'ghost'} size="xs" onClick={() => setEnrichMode('manual')}>
              Manuell (ohne Hunter)
            </Button>
          </div>

          {!isManual && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Text as="span" size="sm" weight="medium" color="muted">
                  Firma
                </Text>
                <Text as="span" size="sm">
                  {displayName(companyName)}
                </Text>
              </div>
              <div className="flex flex-col gap-1.5">
                <Text as="span" size="sm" weight="medium" color="muted">
                  Kontakt
                </Text>
                <Text as="span" size="sm">
                  {displayName(contactName)}
                </Text>
              </div>
            </div>
          )}

          {isManual && (
            <div className="flex flex-col gap-4">
              <ContactEntityPicker<CrmCompanyOut>
                label="Firma"
                placeholder="Firma suchen…"
                emptyText="Keine Firma gefunden"
                query={companyQuery}
                onQueryChange={onCompanyQueryChange}
                items={companyResults}
                getKey={(c) => String(c.id)}
                renderItem={renderCompany}
                onSelect={selectCompany}
                createLabel={selectedCompany ? undefined : `Neu anlegen: ${companyQuery.trim()}`}
                onCreate={selectedCompany ? undefined : createCompanyFromQuery}
                selectedLabel={selectedCompany?.name}
              />
              <ContactEntityPicker<CrmPersonOut>
                label="Kontakt"
                placeholder="Person suchen…"
                emptyText="Keine Person gefunden"
                query={personQuery}
                onQueryChange={onPersonQueryChange}
                items={personResults}
                getKey={(p) => String(p.id)}
                renderItem={renderPerson}
                onSelect={selectPerson}
                createLabel={selectedPerson ? undefined : `Neu anlegen: ${personQuery.trim()}`}
                onCreate={selectedPerson ? undefined : createPersonFromQuery}
                selectedLabel={
                  selectedPerson
                    ? [selectedPerson.first_name, selectedPerson.last_name].filter(Boolean).join(' ')
                    : undefined
                }
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Spinner />
              <Text as="span" size="sm" color="muted">
                {isManual ? 'Verknüpfe Kontaktdaten …' : 'Recherchiere Kontaktdaten …'}
              </Text>
            </div>
          )}

          {result && !loading && (
            <div className={enrichResultPanelVariants()}>
              <Text as="span" size="sm" weight="semibold">
                Ergebnis
              </Text>

              <div className="flex flex-col gap-1.5">
                <Text as="span" size="xs" color="muted">
                  Firma
                </Text>
                <Text as="span" size="sm">
                  <Link
                    to={routeConfig.adminCrmCompanyDetail.path.replace(':id', String(result.company.id))}
                    size="sm"
                  >
                    {result.company.name}
                  </Link>
                  {result.company.industry && ` – ${result.company.industry}`}
                  {result.company.company_size && ` (${result.company.company_size})`}
                </Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Text as="span" size="xs" color="muted">
                  Person
                </Text>
                <Text as="span" size="sm">
                  <Link
                    to={routeConfig.adminCrmPersonDetail.path.replace(':id', String(result.person.id))}
                    size="sm"
                  >
                    {result.person.first_name} {result.person.last_name}
                  </Link>
                  {result.person.email && ` – ${result.person.email}`}
                </Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Text as="span" size="xs" color="muted">
                  Verknüpfungen
                </Text>
                <Text as="span" size="sm">
                  Projekt↔Person: {result.project_crm_person_link_id}
                </Text>
              </div>

              {result.enrichment_details && (
                <div className="flex flex-col gap-1">
                  <Text as="span" size="xs" color="muted">
                    Enrichment
                  </Text>
                  <Text as="span" size="xs">
                    Firma: {result.enrichment_details.company_enriched ? 'angereichert' : 'keine Daten'}
                    {' / '}
                    Person: {result.enrichment_details.person_enriched ? 'angereichert' : 'keine Daten'}
                  </Text>
                </div>
              )}

              {hunterError && (
                <Alert variant="destructive">
                  <Text as="span" size="sm" weight="semibold">
                    Kontaktdaten nicht abrufbar
                  </Text>
                  <Text as="span" size="xs">
                    {hunterErrorMessage(hunterError)}
                  </Text>
                </Alert>
              )}
            </div>
          )}

          {error && !loading && (
            <Text color="error" size="sm">
              {error}
            </Text>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Schließen
          </Button>
          {!result && (
            <Button onClick={submit} disabled={loading}>
              {loading ? 'Läuft …' : isManual ? 'Verknüpfen (ohne Hunter)' : 'Anreichern'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Renders a company search result. */
function renderCompany(company: CrmCompanyOut): React.ReactNode {
  return `${company.name}${company.primary_city ? ` – ${company.primary_city}` : ''}`;
}

/** Renders a person search result. */
function renderPerson(person: CrmPersonOut): React.ReactNode {
  const name = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || DASH;
  return `${name}${person.email ? ` – ${person.email}` : ''}`;
}

export type { ProjectEnrichDialogVariants } from './ProjectEnrichDialog.variants';
