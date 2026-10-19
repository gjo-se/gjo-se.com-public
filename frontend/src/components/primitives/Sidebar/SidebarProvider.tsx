import * as React from 'react';

import { useIsMobile } from '@src/hooks/useMobile';
import { cn } from '@src/lib/utils';

import { SidebarContext } from './useSidebar';

import type { SidebarContextProps } from './SidebarContext.interface';
import type { SidebarProviderProps } from './SidebarProvider.interface';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSidebarCookieValue(): boolean | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  return match[1] === 'true';
}

/**
 * SidebarProvider – Context provider that manages sidebar state, cookie persistence and keyboard shortcut.
 */
export default function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  children,
  ...domProps
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  const [internalOpen, setInternalOpen] = React.useState(() => {
    const cookieValue = getSidebarCookieValue();
    return cookieValue !== null ? cookieValue : defaultOpen;
  });
  const open = openProp ?? internalOpen;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        setInternalOpen(openState);
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            '--sidebar-width': '16rem',
            '--sidebar-width-icon': '3rem',
          } as React.CSSProperties
        }
        className={cn(
          'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
          (domProps as Record<string, unknown>).className as string,
        )}
        {...domProps}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}
