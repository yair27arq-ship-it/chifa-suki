'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { logout } from '@/actions/auth';

export function HeaderUserMenu() {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!usuario) return null;

  const initials = usuario.nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="header-user-menu" ref={ref}>
      <button className="header-user-btn" onClick={() => setOpen((v) => !v)}>
        <span className="header-user-avatar">{initials}</span>
        <span className="header-user-name">{usuario.nombre}</span>
        <ChevronDown size={14} strokeWidth={2} className={`header-user-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="header-user-dropdown">
          <div className="header-user-info">
            <p className="header-user-info-name">{usuario.nombre}</p>
            <p className="header-user-info-role">{usuario.rol}</p>
          </div>
          <button
            className="header-user-logout"
            onClick={() => { setOpen(false); logout(); }}
          >
            <LogOut size={14} strokeWidth={2} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
