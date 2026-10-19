import { useContext } from 'react';

import type { AuthContextValue } from '@src/contexts/AuthContext';
import { AuthContext } from '@src/contexts/AuthContext';

/**
 * Gibt den aktuellen Auth-Context zurück.
 *
 * @throws {Error} wenn außerhalb von `AuthProvider` verwendet.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
