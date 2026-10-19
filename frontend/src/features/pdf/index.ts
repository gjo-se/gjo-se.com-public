/**
 * PDF feature – Public API barrel.
 *
 * Re-exports public types, hooks, components, and services
 * so consumers import from the feature root rather than deep paths.
 */

// Components
export { default as PdfDownloadButton } from './components/pdf-download-button/PdfDownloadButton';
export type { PdfDownloadButtonProps } from './components/pdf-download-button/PdfDownloadButton';

// Hooks
export { usePdfDownload } from './hooks/usePdfDownload';
export type { UsePdfDownloadResult } from './hooks/usePdfDownload';

// Services
export { generatePdf } from './services/pdfService';
export type { PdfGenerateRequest } from './services/pdfService';
