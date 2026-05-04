'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Grid2X2, ShoppingBag, BarChart3, LayoutDashboard, Clock, Users, Package, UtensilsCrossed } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthContext';

const tabsCajero = [
  { href: '/mesas',  label: 'Mesas',       icon: Grid2X2    },
  { href: '/llevar', label: 'Para llevar', icon: ShoppingBag },
  { href: '/turnos', label: 'Mi turno',    icon: Clock       },
];

const tabsAdmin = [
  { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/mesas',        label: 'Mesas',       icon: Grid2X2         },
  { href: '/llevar',       label: 'Para llevar', icon: ShoppingBag     },
  { href: '/resumen',      label: 'Resumen',     icon: BarChart3       },
  { href: '/turnos',       label: 'Mi turno',    icon: Clock           },
  { href: '/admin/turnos', label: 'Personal',    icon: Users           },
  { href: '/inventario',   label: 'Inventario',  icon: Package         },
  { href: '/menu',         label: 'Menú',        icon: UtensilsCrossed },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { usuario } = useAuth();
  const tabs = usuario?.rol === 'admin'
    ? tabsAdmin
    : usuario?.modulos
      ? tabsAdmin.filter((t) => usuario.modulos!.includes(t.href.slice(1)))
      : tabsCajero;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo-area">
        <Logo variant="sidebar" />
      </div>

      <nav className="sidebar-nav">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`sidebar-nav-link ${active ? 'active' : ''}`}>
              <Icon size={17} strokeWidth={active ? 2.5 : 1.7} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
