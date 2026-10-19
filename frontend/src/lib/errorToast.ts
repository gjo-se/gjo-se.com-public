/**
 * errorToast – Einheitliche, persistente Fehler-Toast-Anzeige.
 *
 * Zeigt einen Fehler-Toast, der nicht automatisch verschwindet, sondern erst
 * durch Klick auf den Schließen-Button geschlossen wird. Zentraler Helper, damit
 * alle Fehler im Projekt gleich dargestellt werden.
 */
import { toast } from 'sonner';

/**
 * Zeigt einen persistenten Fehler-Toast (bleibt bis zum manuellen Schließen).
 *
 * @param message Die anzuzeigende Fehlermeldung.
 */
export function showErrorToast(message: string): void {
  toast.error(message, {
    duration: Infinity,
    closeButton: true,
    dismissible: true,
  });
}
