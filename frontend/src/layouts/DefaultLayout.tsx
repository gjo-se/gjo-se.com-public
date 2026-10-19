import { useState } from 'react';
import { Outlet } from 'react-router';

import CookieBanner from '@src/components/molecules/CookieBanner/CookieBanner';
import { useCookieConsent } from '@src/components/molecules/CookieBanner/useCookieConsent';
import Footer from '@src/components/organisms/Footer/Footer';
import Header from '@src/components/organisms/Header/Header';
import Breadcrumb from '@src/components/primitives/Breadcrumb';
import { BreadcrumbTailContext,useBreadcrumbs } from '@src/hooks/useBreadcrumbs';

/**
 * DefaultLayout – Public-Seitenlayout: Header | Breadcrumb | Outlet | Footer | CookieBanner.
 * Breadcrumb wird automatisch aus dem Pfad generiert.
 * Seiten können via useSetBreadcrumbTail() einen dynamischen Titel setzen.
 */
export default function DefaultLayout() {
  const [tail, setTail] = useState<string | null>(null);
  const items = useBreadcrumbs(tail);
  const cookie = useCookieConsent();

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 pt-8 pb-0">
          {items.length > 0 && (
            <div className="mb-8 print:hidden">
              <Breadcrumb items={items} />
            </div>
          )}
          <BreadcrumbTailContext.Provider value={setTail}>
            <Outlet />
          </BreadcrumbTailContext.Provider>
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
      <CookieBanner
        isVisible={cookie.isVisible}
        onDismiss={cookie.onDismiss}
      />
    </div>
  );
}
