import axios from 'axios';

/**
 * Projektweite axios-Instanz.
 *
 * Kein Auth-spezifischer Code hier – der 401-Interceptor wird in
 * `features/auth/AuthContext.tsx` registriert, damit er Zugriff auf
 * `logout()` hat ohne zirkuläre Imports.
 */
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  withCredentials: true, // httpOnly Cookie automatisch mitsenden
});

export default api;
export { api };
