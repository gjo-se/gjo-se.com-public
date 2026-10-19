import { Navigate, useLocation } from 'react-router';

import { routeConfig } from '../../router.config';

/** Leitet alte /fbf/skill-Links sprachbewusst auf /skills um (Bestand/SEO). */
export default function SkillRedirect() {
  const { pathname } = useLocation();
  const prefix = pathname.startsWith('/en') ? '/en' : '';
  return <Navigate to={`${prefix}${routeConfig.fbfSkill.path}`} replace />;
}
