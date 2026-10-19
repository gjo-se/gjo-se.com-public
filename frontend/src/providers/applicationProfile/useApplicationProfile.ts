/**
 * useApplicationProfile – Public profile data hook for the About / Home page.
 *
 * Wraps `getPublicProfile(locale)` via TanStack Query and returns a discriminated
 * result object. Pattern: `usePortfolioList`. The locale (from `useLocaleApi`)
 * selects the localized `story`/`focusAreas`/career descriptions server-side.
 */
import { useQuery } from '@tanstack/react-query';

import { useLocaleApi } from '@src/hooks/useLocaleApi';
import { getPublicProfile } from '@src/lib/api/applicationProfile';
import type {
  ApplicationProfileOut,
  CareerEntryOut,
  FocusAreaOut,
  SkillPublicOut,
} from '@src/lib/api/applicationProfile';
import { getApplicationProfileStreamUrl } from '@src/lib/api/applicationProfileStream';

export interface UseApplicationProfileResult {
  profile: ApplicationProfileOut | null;
  story: string | null;
  focusAreas: FocusAreaOut[];
  photoUrl: string | null;
  location: string | null;
  remote: string | null;
  career: CareerEntryOut[];
  languages: string[];
  skills: SkillPublicOut[];
  loading: boolean;
  error: string | null;
}

/**
 *
 */
export function useApplicationProfile(): UseApplicationProfileResult {
  const { locale } = useLocaleApi();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['applicationProfile', 'public', locale],
    queryFn: () => getPublicProfile(locale),
    staleTime: 5 * 60 * 1000,
  });

  return {
    profile: data?.profile ?? null,
    story: data?.story ?? null,
    focusAreas: data?.focusAreas ?? [],
    photoUrl: data?.profile?.photoUrl ? getApplicationProfileStreamUrl(data.profile.photoUrl) : null,
    location: data?.profile?.location ?? null,
    remote: data?.profile?.remote ?? null,
    career: data?.career ?? [],
    languages: data?.languages ?? [],
    skills: data?.skills ?? [],
    loading: isLoading,
    error: isError ? (error?.message ?? 'Profil konnte nicht geladen werden.') : null,
  };
}
