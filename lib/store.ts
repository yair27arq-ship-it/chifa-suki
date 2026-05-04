'use client';

import { create } from 'zustand';
import type { ItemCarrito, PedidoItem } from '@/types';

// ============================================================
// Zustand Store — Estado global del carrito activo
// ============================================================

interface PedidoStore {
  // ID del pedido activo en Supabase (null si no se ha guardado aún)
  pedidoId: string | null;
  items: ItemCarrito[];

  // Acciones
  setPedidoId: (id: string | null) => void;
  setItems: (items: ItemCarrito[]) => void;
  agregarItem: (item: ItemCarrito) => void;
  quitarItem: (platoId: number, opcionLabel: string | null) => void;
  actualizarCantidad: (platoId: number, opcionLabel: string | null, cantidad: number) => void;
  setNotasItem: (platoId: number, opcionLabel: string | null, notas: string) => void;
  limpiarCarrito: () => void;

  // Carga items desde pedido_items de Supabase
  cargarDesdeDB: (items: PedidoItem[]) => void;
}

export const usePedidoStore = create<PedidoStore>((set, get) => ({
  pedidoId: null,
  items: [],

  setPedidoId: (id) => set({ pedidoId: id }),

  setItems: (items) => set({ items }),

  agregarItem: (nuevoItem) => {
    const { items } = get();
    const existente = items.find(
      (i) => i.plato_id === nuevoItem.plato_id && i.opcion_label === nuevoItem.opcion_label
    );

    if (existente) {
      // Sumar cantidad al existente
      set({
        items: items.map((i) => {
          if (i.plato_id === nuevoItem.plato_id && i.opcion_label === nuevoItem.opcion_label) {
            const nuevaCantidad = i.cantidad + nuevoItem.cantidad;
            return {
              ...i,
              cantidad: nuevaCantidad,
              subtotal: Number((nuevaCantidad * i.precio_unitario).toFixed(2)),
            };
          }
          return i;
        }),
      });
    } else {
      set({ items: [...items, nuevoItem] });
    }
  },

  quitarItem: (platoId, opcionLabel) => {
    set({
      items: get().items.filter(
        (i) => !(i.plato_id === platoId && i.opcion_label === opcionLabel)
      ),
    });
  },

  actualizarCantidad: (platoId, opcionLabel, cantidad) => {
    if (cantidad <= 0) {
      get().quitarItem(platoId, opcionLabel);
      return;
    }
    set({
      items: get().items.map((i) => {
        if (i.plato_id === platoId && i.opcion_label === opcionLabel) {
          return {
            ...i,
            cantidad,
            subtotal: Number((cantidad * i.precio_unitario).toFixed(2)),
          };
        }
        return i;
      }),
    });
  },

  setNotasItem: (platoId, opcionLabel, notas) => {
    set({
      items: get().items.map((i) =>
        i.plato_id === platoId && i.opcion_label === opcionLabel
          ? { ...i, notas: notas || null }
          : i
      ),
    });
  },

  limpiarCarrito: () => set({ pedidoId: null, items: [] }),

  cargarDesdeDB: (dbItems) => {
    set({
      items: dbItems.map((it) => ({
        plato_id: it.plato_id,
        nombre_plato: it.nombre_plato,
        precio_unitario: Number(it.precio_unitario),
        cantidad: it.cantidad,
        subtotal: Number(it.subtotal),
        opcion_label: it.opcion_label,
        notas: it.notas ?? null,
        isCustom: it.opcion_label?.startsWith('_cust_') ?? false,
      })),
    });
  },
}));

// Selector de total calculado
export const useTotal = () =>
  usePedidoStore((s) => s.items.reduce((acc, i) => acc + i.subtotal, 0));
