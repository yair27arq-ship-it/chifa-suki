'use client';

import { useState } from 'react';
import type { ItemCarrito } from '@/types';

interface ItemPersonalizadoModalProps {
  onClose: () => void;
  onAgregar: (item: ItemCarrito) => void;
}

export function ItemPersonalizadoModal({ onClose, onAgregar }: ItemPersonalizadoModalProps) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState('');

  const handleAgregar = () => {
    const nombreTrimmed = nombre.trim();
    const precioNum = parseFloat(precio.replace(',', '.'));

    if (!nombreTrimmed) {
      setError('Ingresa una descripción.');
      return;
    }
    if (isNaN(precioNum) || precioNum <= 0) {
      setError('Ingresa un precio válido.');
      return;
    }

    const item: ItemCarrito = {
      plato_id: 0,
      nombre_plato: nombreTrimmed,
      precio_unitario: precioNum,
      cantidad: 1,
      subtotal: precioNum,
      opcion_label: `_cust_${Date.now()}`,
      isCustom: true,
    };

    onAgregar(item);
    onClose();
  };

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-box item-custom-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-title">Ítem personalizado</h2>
        <p className="confirm-desc">Agrega un ítem que no está en el menú.</p>

        <div className="item-custom-fields">
          <div className="item-custom-field">
            <label className="item-custom-label">Descripción</label>
            <input
              className="item-custom-input"
              type="text"
              placeholder="Ej: Agua mineral, Postre especial…"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(''); }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
            />
          </div>
          <div className="item-custom-field">
            <label className="item-custom-label">Precio (S/)</label>
            <input
              className="item-custom-input item-custom-input-precio"
              type="number"
              min="0"
              step="0.50"
              placeholder="0.00"
              value={precio}
              onChange={(e) => { setPrecio(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
            />
          </div>
          {error && <p className="item-custom-error">{error}</p>}
        </div>

        <div className="confirm-actions">
          <button className="btn-confirm-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-confirm-ok" onClick={handleAgregar}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
