/** DEV-Only Konfiguration – via Vite tree-shaked aus Production-Builds entfernt. */

export const devUsers = [
  { email: 'admin@gjo.com', label: 'Admin' },
  { email: 'dev@gjo.com', label: 'Dev-User' },
] as const;
