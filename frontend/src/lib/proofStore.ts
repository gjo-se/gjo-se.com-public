import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ProofSlice {
  /** Aktive Projekt-ID des Bewerbungs-Proofs (null = kein Kontext). */
  projectId: number | null
  setProjectId: (projectId: number | null) => void
  clearProof: () => void
}

/** sessionStorage-Key – der Kontext endet bewusst mit der Session (Plan-Vorgabe). */
const STORAGE_KEY = 'skills-proof-context';

/**
 * Bewerbungs-Proof-Kontext: nur die Projekt-ID, persistiert in sessionStorage.
 * Navigation (Home → Skills) behält die Sektion; der Kontext endet mit der Session.
 */
export const useProofStore = create<ProofSlice>()(
  persist(
    (set) => ({
      projectId: null,
      setProjectId: (projectId) => set({ projectId }),
      clearProof: () => set({ projectId: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
