import { Outlet } from 'react-router';

import VerticalNav from '@src/components/nav/VerticalNav/VerticalNav';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@src/components/primitives/Sidebar';

/**
 * AdminLayout – Admin-Seitenlayout: VerticalNav | Outlet.
 * Nutzt shadcn SidebarProvider + Sidebar mit collapsible="icon".
 */
export default function AdminLayout() {
  return (
    <SidebarProvider>
      <VerticalNav />
      <main className="flex h-screen w-full flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
