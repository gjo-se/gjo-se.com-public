/**
 * ProjectCombobox – Project-specialisation of the generic `EntityLinkCombobox`.
 *
 * Shares the Project item rendering (`id – title (city)`), value extraction and
 * dialog confirmation used by the slave/master linking flows.
 */
import EntityLinkCombobox from '@src/components/molecules/EntityLinkCombobox/EntityLinkCombobox';
import type { Project } from '@src/lib/api/aiscope';

export interface ProjectComboboxProps {
  placeholder: string;
  emptyText: string;
  onSearch: (query: string) => Promise<Project[]>;
  onLink: (project: Project) => Promise<void>;
  confirmMessage: (project: Project) => string;
  onLinked: () => void;
}

/**
 *
 */
export default function ProjectCombobox({
  placeholder,
  emptyText,
  onSearch,
  onLink,
  confirmMessage,
  onLinked,
}: ProjectComboboxProps) {
  return (
    <EntityLinkCombobox<Project>
      placeholder={placeholder}
      emptyText={emptyText}
      onSearch={onSearch}
      onLink={onLink}
      renderItem={(p) => (
        <>
          {p.id} – {p.title} ({p.city ?? '–'})
        </>
      )}
      getItemValue={(p) => String(p.id)}
      confirmVariant="dialog"
      confirmMessage={confirmMessage}
      onLinked={onLinked}
    />
  );
}
