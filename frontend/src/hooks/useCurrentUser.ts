import { useAuth } from '@src/hooks/useAuth';

/** Returns the currently authenticated user or null. */
export function useCurrentUser() {
  return useAuth().user;
}
