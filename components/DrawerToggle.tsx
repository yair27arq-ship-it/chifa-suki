'use client';

import { Menu, X } from 'lucide-react';
import { useDrawer } from '@/components/DrawerContext';

export function DrawerToggle() {
  const { open, setOpen } = useDrawer();
  return (
    <button
      className="drawer-toggle-inline"
      onClick={() => setOpen(!open)}
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
    >
      {open ? <X size={20} /> : <Menu size={20} />}
    </button>
  );
}
