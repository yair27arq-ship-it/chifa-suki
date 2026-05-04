'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Grid2X2, ShoppingBag, BarChart3, LayoutDashboard, Clock, Users, Package, X, LogOut, UtensilsCrossed } from 'lucide-react';
import { useDrawer } from '@/components/DrawerContext';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthContext';
import { logout } from '@/actions/auth';

const tabsCajero = [
  { href: '/mesas',  label: 'Mesas',       icon: Grid2X2     },
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

export function BottomNav() {
  const pathname = usePathname();
  const { open, setOpen } = useDrawer();
  const { usuario } = useAuth();
  const tabs = usuario?.rol === 'admin'
    ? tabsAdmin
    : usuario?.modulos
      ? tabsAdmin.filter((t) => usuario.modulos!.includes(t.href.slice(1)))
      : tabsCajero;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="drawer-overlay" onClick={() => setOpen(false)} />
      )}

      {/* Drawer panel */}
      <nav className={`drawer-panel${open ? ' open' : ''}`}>
        <div className="drawer-header">
          <Logo variant="sidebar" />
          <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`drawer-nav-link${active ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.7} />
              <span>{label}</span>
            </Link>
          );
        })}

        <div className="drawer-footer">
          {usuario && (
            <div className="sidebar-user" style={{ padding: '0 16px 8px' }}>
              <p className="sidebar-user-name">{usuario.nombre}</p>
              <p className="sidebar-user-role">{usuario.rol}</p>
            </div>
          )}
          <button
            className="drawer-nav-link"
            style={{ color: 'var(--danger, #e53e3e)', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { setOpen(false); logout(); }}
          >
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </nav>
    </>
  );
}
