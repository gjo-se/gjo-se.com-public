import { useLocaleApi } from '@src/hooks/useLocaleApi';
import api from '@src/lib/api/axios';
import { getStreamUrl } from '@src/lib/getStreamUrl';

import type { PortfolioDetail, PortfolioListItem, Proof } from '../core/types';

/**
 * Public-Portfolio-Service (Hook) für die public-FE.
 *
 * Nutzt `useLocaleApi()` für locale-aware API-Calls gegen die public-Endpunkte:
 *   GET /api/v1/public/portfolio          – Liste
 *   GET /api/v1/public/portfolio/{slug}   – Detail
 *   GET /api/v1/public/portfolio/{slug}/proofs – Proofs
 */
export function usePortfolioService() {
  const { withLocale } = useLocaleApi();

  const listPortfolios = async (): Promise<PortfolioListItem[]> => {
    const res = await api.get(withLocale('/public/portfolio'));
    return res.data;
  };

  const getPortfolio = async (slug: string): Promise<PortfolioDetail> => {
    const res = await api.get(withLocale(`/public/portfolio/${slug}`));
    return res.data;
  };

  const getProofs = async (slug: string): Promise<Proof[]> => {
    const res = await api.get(withLocale(`/public/portfolio/${slug}/proofs`));
    return res.data;
  };

  return { listPortfolios, getPortfolio, getProofs, getStreamUrl };
}
