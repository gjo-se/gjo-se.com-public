/**
 * useProfileDetail – Loads the singleton application profile and provides
 * per-field save via the existing PUT endpoint (including localized
 * story fields mapped onto the ``translations`` dict) plus photo
 * upload via the multipart POST endpoint.
 *
 * Pattern reference: CompanyDetailPage.handleCompanySave,
 * Portfolio TranslationFields (multi-locale rows).
 */
import { useCallback, useEffect, useState } from 'react';

import { getProfile, uploadProfilePhoto, upsertProfile } from '@src/lib/api/applicationProfile';
import type { ApplicationProfileCreate, ApplicationProfileLocaleFields, ApplicationProfileOut } from '@src/lib/api/applicationProfile';

export interface UseProfileDetailResult {
  profile: ApplicationProfileOut | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  handleSave: (field: string, value: string) => Promise<void>;
  uploadPhoto: (file: File) => Promise<void>;
}

/** Matches DetailTable field keys like 'story_de' / 'story_en'. */
const LOCALE_FIELD_RE = /^story_(de|en)$/;

/** Deep-copies the profile's translations map so PUT payloads never mutate state. */
function cloneTranslations(
  translations: Record<string, ApplicationProfileLocaleFields> | undefined,
): Record<string, ApplicationProfileLocaleFields> {
  const result: Record<string, ApplicationProfileLocaleFields> = {};
  Object.entries(translations ?? {}).forEach(([locale, fields]) => {
    result[locale] = { story: fields?.story ?? null };
  });
  return result;
}

/**
 *
 */
export function useProfileDetail(): UseProfileDetailResult {
  const [profile, setProfile] = useState<ApplicationProfileOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProfile();
        if (!cancelled) {
          setProfile(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          // 404 – no profile yet, form stays empty
          if (err instanceof Error && err.message.startsWith('404')) {
            setProfile(null);
          } else {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Per-field save: merge changed field into full profile data → PUT.
  // Localized fields (story_de/story_en) are merged into the complete
  // translations dict – the BE replaces the whole translation set when the
  // key is present, so the other locale must be carried along.
  const handleSave = useCallback(
    async (field: string, value: string) => {
      if (!profile) return;

      setError(null);

      // Build full profile payload from current state
      const data: Record<string, unknown> = {
        full_name: profile.fullName,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        location: profile.location ?? null,
        remote: profile.remote ?? null,
        languages: profile.languages ?? null,
        photo_url: profile.photoUrl ?? null,
        headline: profile.headline ?? null,
        github_url: profile.githubUrl ?? null,
        linkedin_url: profile.linkedinUrl ?? null,
        website_url: profile.websiteUrl ?? null,
        hourly_rate: profile.hourlyRate ?? null,
        hourly_rate_currency: profile.hourlyRateCurrency ?? null,
        available_from: profile.availableFrom ?? null,
        translations: cloneTranslations(profile.translations),
      };

      const localeMatch = LOCALE_FIELD_RE.exec(field);
      if (localeMatch) {
        // The regex captures only the locale (e.g. 'de' from 'story_de').
        const locale = localeMatch[1];
        const existing = data['translations'] as Record<string, ApplicationProfileLocaleFields>;
        data['translations'] = {
          ...existing,
          [locale]: { ...existing[locale], story: value || null },
        };
      } else {
        // Override the changed field (field names are snake_case, matching API)
        data[field] = value || null;
      }

      const updated = await upsertProfile(data as unknown as ApplicationProfileCreate);
      setProfile(updated);
    },
    [profile],
  );

  // Photo upload: multipart POST, response is the updated profile
  const uploadPhoto = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const updated = await uploadProfilePhoto(file);
        setProfile(updated);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Fehler beim Foto-Upload');
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return { profile, loading, uploading, error, handleSave, uploadPhoto };
}
