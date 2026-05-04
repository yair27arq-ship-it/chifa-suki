'use client';

import { useCallback, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePedidoStore, useTotal } from '@/lib/store';
import {
  crearPedido,
  actualizarPedido,
  cobrarPedido,
  anularPedido,
} from '@/actions/pedidos';
import type { ItemCarrito, MetodoPago, PagoParte } from '@/types';

// ============================================================
// Hook usePedido — lógica del carrito activo
// ============================================================

export function usePedido(
  tipo: 'mesa' | 'llevar',
  mesaId: number | null = null,
  numeroOrden: number | null = null
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { items, agregarItem, quitarItem, actualizarCantidad, limpiarCarrito, setPedidoId } =
    usePedidoStore();
  const total = useTotal();
  const pedidoId = usePedidoStore((s) => s.pedidoId);

  // Timer para debounce de guardado: agrupa cambios rápidos en una sola llamada
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard para evitar crear el pedido más de una vez en taps rápidos
  const isCreatingRef = useRef(false);

  /**
   * Programa un guardado debounced: espera 350 ms desde el último cambio
   * antes de enviar a Supabase. Así varios toques rápidos = 1 llamada.
   */
  const scheduleGuardar = useCallback((id: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      const currentItems = usePedidoStore.getState().items;
      await actualizarPedido(id, currentItems);
    }, 350);
  }, []);

  /**
   * Cancela el timer y guarda inmediatamente (usado antes de cobrar/anular).
   */
  const flushGuardar = useCallback(async () => {
    if (!saveTimerRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const id = usePedidoStore.getState().pedidoId;
    if (id) {
      const currentItems = usePedidoStore.getState().items;
      await actualizarPedido(id, currentItems);
    }
  }, []);

  /**
   * Agrega un item al carrito y persiste en Supabase automáticamente.
   * Si es el primer ítem crea el pedido; si no, debouncea la actualización.
   */
  const agregar = useCallback(
    (item: ItemCarrito) => {
      agregarItem(item);
      const id = usePedidoStore.getState().pedidoId;

      if (!id) {
        if (isCreatingRef.current) return; // Ya hay una creación en curso
        isCreatingRef.current = true;
        startTransition(async () => {
          const nuevosItems = usePedidoStore.getState().items;
          const result = await crearPedido(tipo, mesaId, numeroOrden, nuevosItems);
          if (result.id) setPedidoId(result.id);
          isCreatingRef.current = false;
        });
      } else {
        scheduleGuardar(id);
      }
    },
    [agregarItem, tipo, mesaId, numeroOrden, setPedidoId, scheduleGuardar]
  );

  /**
   * Actualiza la cantidad de un item y debouncea el guardado.
   */
  const actualizarItem = useCallback(
    (platoId: number, opcionLabel: string | null, cantidad: number) => {
      actualizarCantidad(platoId, opcionLabel, cantidad);
      const id = usePedidoStore.getState().pedidoId;
      if (id) scheduleGuardar(id);
    },
    [actualizarCantidad, scheduleGuardar]
  );

  /**
   * Quita un item del carrito y debouncea el guardado.
   */
  const quitar = useCallback(
    (platoId: number, opcionLabel: string | null) => {
      quitarItem(platoId, opcionLabel);
      const id = usePedidoStore.getState().pedidoId;
      if (id) scheduleGuardar(id);
    },
    [quitarItem, scheduleGuardar]
  );

  /**
   * Cobra el pedido y regresa a la pantalla previa.
   * Primero hace flush de cualquier guardado pendiente para no perder ítems.
   */
  const cobrar = useCallback(async (metodoPago?: MetodoPago, pagoPartes?: PagoParte[]) => {
    const id = usePedidoStore.getState().pedidoId;
    if (!id) return;
    await flushGuardar();
    startTransition(async () => {
      const { error } = await cobrarPedido(id, metodoPago, pagoPartes);
      if (!error) {
        limpiarCarrito();
        router.push(tipo === 'mesa' ? '/mesas' : '/llevar');
      } else {
        alert(`Error al cobrar: ${error}`);
      }
    });
  }, [limpiarCarrito, router, tipo, flushGuardar]);

  /**
   * Anula el pedido. Cancela cualquier guardado pendiente (no hace falta persistir).
   */
  const anular = useCallback(async () => {
    const id = usePedidoStore.getState().pedidoId;
    if (!id) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    startTransition(async () => {
      const { error } = await anularPedido(id);
      if (!error) {
        limpiarCarrito();
        router.push(tipo === 'mesa' ? '/mesas' : '/llevar');
      }
    });
  }, [limpiarCarrito, router, tipo]);

  const notasItem = useCallback((platoId: number, opcionLabel: string | null, notas: string) => {
    usePedidoStore.getState().setNotasItem(platoId, opcionLabel, notas);
    const id = usePedidoStore.getState().pedidoId;
    if (id) scheduleGuardar(id);
  }, [scheduleGuardar]);

  return {
    items,
    total,
    isPending,
    pedidoId,
    agregar,
    quitar,
    actualizarItem,
    cobrar,
    anular,
    notasItem,
  };
}
