import { useLanguage } from '@src/contexts/LanguageContext';
import { localePathname } from '@src/lib/locale';
import { useProofStore } from '@src/lib/proofStore';
import { routeConfig } from '@src/router.config';


/**
 * Proof-Navigation: liefert den Session-Kontext + den aktuell gültigen Skills-Pfad
 * (sprachbewusst). Bei aktivem Kontext zeigen alle internen Skills-Links auf die
 * Proof-URL, damit die Adresszeile die stabile Teilen-URL behält (Nav-Propagation).
 */
export function useProofNavigation() {
  const projectId = useProofStore((s) => s.projectId);
  const setProjectId = useProofStore((s) => s.setProjectId);
  const { lang } = useLanguage();

  const basePath =
    projectId != null
      ? routeConfig.fbfSkillProof.path.replace(':projectId', String(projectId))
      : routeConfig.fbfSkill.path;

  const skillsPath = localePathname(basePath, lang);

  return { projectId, setProjectId, skillsPath };
}
