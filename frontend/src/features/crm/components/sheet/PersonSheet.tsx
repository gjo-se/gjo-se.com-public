/**
 * PersonSheet – Slide-over detail panel for a CRM Person.
 *
 * Shows the person's linked companies via the Person-Company junction.
 * Full association CRUD will be added in a follow-up ticket.
 */
import Text from '@src/components/primitives/Text';

/** Props for the PersonSheet slide-over panel. */
export interface PersonSheetProps {
  /** UUID of the person whose details are shown. */
  personId: number;
  /** Person display name for the sheet context. */
  personName: string;
}

/** Slide-over panel showing company assignments for a person. */
export default function PersonSheet({ personId: _personId, personName: _personName }: PersonSheetProps) {
  return (
    <section className="flex flex-col gap-6">
      <section>
        <div className="mb-3">
          <Text variant="h3" as="h3">
            Firmen-Zuordnungen
          </Text>
        </div>
        <Text color="muted">
          Firmen-Verknüpfungen folgen in einem späteren Ticket.
        </Text>
      </section>
    </section>
  );
}
