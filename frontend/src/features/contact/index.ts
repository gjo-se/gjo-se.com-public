/**
 * Contact-Feature-Barrel – öffentliche API des Features.
 */
export {
  submitContact,
  fetchContactToken,
  listContactSubmissions,
  deleteContactSubmission,
} from './services/contactService';
export type { ContactSubmissionPayload, ContactSubmissionOut } from './services/contactService';
export { useContactSubmissionTable } from './hooks/useContactSubmissionTable';
export type { UseContactSubmissionTableReturn } from './hooks/useContactSubmissionTable';
export { useContactToken } from './hooks/useContactToken';
export type { UseContactTokenReturn } from './hooks/useContactToken';
export { default as ContactForm } from './components/contact-form/ContactForm';
