'use client';

import { usePathname } from 'next/navigation';
import { SidebarNav } from '@/components/SidebarNav';
import { BottomNav } from '@/components/BottomNav';
import { CajaCerradaOverlay } from '@/components/CajaCerradaOverlay';
import { HeaderUserMenu } from '@/components/HeaderUserMenu';
import { DrawerToggle } from '@/components/DrawerToggle';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <SidebarNav />
      <main className="app-main">
        <div className="header-drawer-slot">
          <DrawerToggle />
        </div>
        <HeaderUserMenu />
        <CajaCerradaOverlay />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
