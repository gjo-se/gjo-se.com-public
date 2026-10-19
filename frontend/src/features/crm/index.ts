/**
 * CRM Feature barrel – Public API.
 *
 * Re-exports public hooks, components, and types
 * so consumers import from the feature root rather than deep paths.
 */

// Hooks
export { useCompanyTable } from './hooks/useCompanyTable';
export type { CompanyTableRow, UseCompanyTableResult } from './hooks/useCompanyTable';

export { usePersonTable } from './hooks/usePersonTable';
export type { PersonTableRow, UsePersonTableResult } from './hooks/usePersonTable';

export { useProjectEnrichmentStatus } from '@src/providers/projectEnrichment/useProjectEnrichmentStatus';
export type { UseProjectEnrichmentStatusResult } from '@src/providers/projectEnrichment/useProjectEnrichmentStatus';

// Components
export { default as CompanySheet } from './components/sheet/CompanySheet';
export type { CompanySheetProps } from './components/sheet/CompanySheet';

export { default as EnrichDialog } from './components/dialog/EnrichDialog';
export type { EnrichDialogProps } from './components/dialog/EnrichDialog';

export { default as PersonSheet } from './components/sheet/PersonSheet';
export type { PersonSheetProps } from './components/sheet/PersonSheet';

export { default as CompanyPersonsSection } from './components/company-detail/CompanyPersonsSection';
export type { CompanyPersonsSectionProps } from './components/company-detail/CompanyPersonsSection';

// Shared column definitions
export { createCompanyAddressColumns } from './shared/CompanyAddressColumns';

export type { ProjectEnrichDialogProps } from '@src/components/molecules/ProjectEnrichDialog/ProjectEnrichDialog';

export type { ProjectEnrichRequest, ProjectEnrichResponse } from '@src/lib/api/crm';
export {
  createAddress,
  deleteAddress,
  deleteCompany,
  deletePerson,
  enrichExistingPerson,
  extractCompanyAddress,
  fetchAddresses,
  fetchCompanies,
  fetchCompanyPersons,
  getCompany,
  getPerson,
  mergeCompanies,
  updateAddress,
  updateCompany,
  updatePerson,
} from '@src/lib/api/crm';
