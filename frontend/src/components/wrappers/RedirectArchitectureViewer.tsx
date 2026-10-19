import { Navigate, useParams } from 'react-router';

import { routeConfig } from '@src/router.config';

/** Redirect component: /admin/architecture-viewer/* → /admin/viscera/* */
export default function RedirectArchitectureViewer() {
  const { '*': splat } = useParams();
  const suffix = splat ? `/${splat}` : '';
  return <Navigate to={`${routeConfig.adminViscera.path}${suffix}`} replace />;
}
