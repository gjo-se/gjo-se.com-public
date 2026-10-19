import PageHeader from '@src/components/molecules/PageHeader/PageHeader';
import UserProfile from '@src/components/molecules/UserProfile/UserProfile';
import Button from '@src/components/primitives/Button';
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@src/components/primitives/Tabs';
import {
  AccountDeleteSection,
  EmailChangeFormSection,
  PasswordChangeFormSection,
  UserApiKeysTab,
} from '@src/features/auth';
import { useCurrentUser } from '@src/features/auth';
import { useLogout } from '@src/features/auth';
import { useQueryParam } from '@src/hooks/useQueryParam';

/**
 * Renders the user dashboard with profile, API keys, and account settings via tabbed navigation.
 *
 * @deprecated Nicht öffentlich erreichbar (kein User-Dashboard, Route geschlossen 2026-08-21);
 * Code bleibt für späteren Self-Service (siehe `router.config.ts`).
 */
export default function DashboardPage() {
  const user = useCurrentUser();
  const handleLogout = useLogout();
  const [tab, setTab] = useQueryParam('tab', 'profile');

  return (
    <>
      <PageHeader title={`Willkommen, ${user?.name}`} subtitle={`${user?.email} · ${user?.role}`} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="apikeys">API-Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-8">
            <UserProfile name={user?.name} email={user?.email} role={user?.role} />
            <Button variant="secondary" onClick={handleLogout}>Abmelden</Button>
            <PasswordChangeFormSection />
            <EmailChangeFormSection />
            <AccountDeleteSection />
          </div>
        </TabsContent>

        <TabsContent value="apikeys">
          <UserApiKeysTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
