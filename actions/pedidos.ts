'use server';

import { getSupabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { ItemCarrito, MetodoPago, PagoParte } from '@/types';
import { getJornadaActual } from '@/actions/cierres';

// ============================================================
// Server Actions — Gestión de Pedidos
// ============================================================

/**
 * Crea un nuevo pedido en Supabase y agrega sus items.
 * Retorna el ID del pedido creado.
 */
export async function crearPedido(
  tipo: 'mesa' | 'llevar',
  mesaId: number | null,
  _numeroOrden: number | null,
  items: ItemCarrito[]
): Promise<{ id: string; error?: string }> {
  const supabase = await getSupabaseServer();

  const total = items.reduce((acc, i) => acc + i.subtotal, 0);

  // Para órdenes de llevar, obtener el siguiente número de la secuencia DB
  let numeroOrden: number | null = null;
  if (tipo === 'llevar') {
    const { data, error } = await supabase.rpc('siguiente_numero_orden');
    if (error || data == null) {
      return { id: '', error: error?.message || 'Error al generar número de orden' };
    }
    numeroOrden = data as number;
  }

  const fechaDia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const jornada = await getJornadaActual(fechaDia);

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      tipo,
      mesa_id: mesaId,
      numero_orden: numeroOrden,
      estado: 'abierto',
      total: Number(total.toFixed(2)),
      fecha_dia: fechaDia,
      jornada,
    })
    .select('id')
    .single();

  if (pedidoError || !pedido) {
    return { id: '', error: pedidoError?.message || 'Error al crear pedido' };
  }

  // Insertar items (plato_id 0 = ítem personalizado, se guarda como null para respetar la FK)
  const pedidoItems = items.map((item) => ({
    pedido_id: pedido.id,
    plato_id: item.plato_id || null,
    nombre_plato: item.nombre_plato,
    precio_unitario: item.precio_unitario,
    cantidad: item.cantidad,
    subtotal: item.subtotal,
    opcion_label: item.opcion_label,
    notas: item.notas?.trim() || null,
  }));

  const { error: itemsError } = await supabase.from('pedido_items').insert(pedidoItems);

  if (itemsError) {
    return { id: pedido.id, error: itemsError.message };
  }

  revalidatePath('/mesas');
  revalidatePath('/llevar');

  return { id: pedido.id };
}

/**
 * Sincroniza los items de un pedido existente con los del carrito.
 * Estrategia: DELETE todos los items existentes → INSERT los nuevos.
 */
export async function actualizarPedido(
  pedidoId: string,
  items: ItemCarrito[]
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();

  const total = items.reduce((acc, i) => acc + i.subtotal, 0);

  const pedidoItems = items.map((item) => ({
    pedido_id: pedidoId,
    plato_id: item.plato_id || null,
    nombre_plato: item.nombre_plato,
    precio_unitario: item.precio_unitario,
    cantidad: item.cantidad,
    subtotal: item.subtotal,
    opcion_label: item.opcion_label,
    notas: item.notas?.trim() || null,
  }));

  // DELETE items anteriores + UPDATE total en paralelo (no dependen entre sí)
  const [{ error: deleteError }, { error: updateError }] = await Promise.all([
    supabase.from('pedido_items').delete().eq('pedido_id', pedidoId),
    supabase.from('pedidos').update({ total: Number(total.toFixed(2)) }).eq('id', pedidoId),
  ]);

  if (deleteError) return { error: deleteError.message };
  if (updateError) return { error: updateError.message };

  // INSERT nuevos items (debe ir después del DELETE para evitar duplicados)
  if (pedidoItems.length > 0) {
    const { error: insertError } = await supabase.from('pedido_items').insert(pedidoItems);
    if (insertError) return { error: insertError.message };
  }

  // No revalidatePath aquí: el cliente gestiona estado local y el realtime
  // actualiza /mesas y /llevar. Invalidar en cada save (cada ~350 ms) es trabajo innecesario.

  return {};
}

/**
 * Cobra un pedido: cambia estado a 'cobrado', registra timestamp y asegura que la jornada sea la actual.
 */
export async function cobrarPedido(
  pedidoId: string,
  metodoPago?: MetodoPago,
  pagoPartes?: PagoParte[]
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();

  const fechaDia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const jornadaActual = await getJornadaActual(fechaDia);

  const updateData: Record<string, unknown> = {
    estado: 'cobrado',
    cobrado_at: new Date().toISOString(),
    jornada: jornadaActual, // Actualizamos la jornada al momento del cobro real
  };
  if (metodoPago) updateData.metodo_pago = metodoPago;
  if (pagoPartes && pagoPartes.length > 0) updateData.pago_partes = pagoPartes;

  const { error } = await supabase
    .from('pedidos')
    .update(updateData)
    .eq('id', pedidoId);

  if (error) return { error: error.message };

  revalidatePath('/mesas');
  revalidatePath('/llevar');
  revalidatePath('/resumen');

  return {};
}

/**
 * Anula un pedido.
 */
export async function anularPedido(pedidoId: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'anulado' })
    .eq('id', pedidoId);

  if (error) return { error: error.message };

  revalidatePath('/mesas');
  revalidatePath('/llevar');
  revalidatePath('/resumen');

  return {};
}

/**
 * Obtiene el pedido abierto de una mesa específica (si existe).
 */
export async function getPedidoAbiertoDeMesa(mesaId: number) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('pedidos')
    .select('id, pedido_items(id, pedido_id, plato_id, nombre_plato, precio_unitario, cantidad, subtotal, opcion_label, notas)')
    .eq('mesa_id', mesaId)
    .eq('estado', 'abierto')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

/**
 * Obtiene la lista de pedidos para llevar abiertos.
 */
export async function getPedidosLlevarAbiertos() {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('pedidos')
    .select('id, numero_orden, created_at, total, pedido_items(id)')
    .eq('tipo', 'llevar')
    .eq('estado', 'abierto')
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Obtiene un pedido por ID con sus items.
 */
export async function getPedidoPorId(pedidoId: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('pedidos')
    .select('id, tipo, mesa_id, numero_orden, estado, total, created_at, cobrado_at, fecha_dia, metodo_pago, pago_partes, pedido_items(id, pedido_id, plato_id, nombre_plato, precio_unitario, cantidad, subtotal, opcion_label, notas), mesas(id, nombre, numero, activa)')
    .eq('id', pedidoId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Obtiene los pedidos del día actual (todos los estados).
 */
export async function getPedidosDelDia(fecha?: string) {
  const supabase = await getSupabaseServer();
  const hoy = fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const { data } = await supabase
    .from('pedidos')
    .select('id, tipo, mesa_id, numero_orden, estado, total, created_at, metodo_pago, pago_partes, fecha_dia, jornada, pedido_items(id, nombre_plato, cantidad, subtotal, opcion_label), mesas(nombre, numero)')
    .eq('fecha_dia', hoy)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Edita estado y/o total de un pedido desde el resumen.
 */
export async function editarPedidoResumen(
  pedidoId: string,
  campos: { estado?: 'abierto' | 'cobrado' | 'anulado'; total?: number }
): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const update: Record<string, unknown> = {};
  if (campos.estado !== undefined) update.estado = campos.estado;
  if (campos.total !== undefined) update.total = Number(campos.total.toFixed(2));

  const { error } = await supabase.from('pedidos').update(update).eq('id', pedidoId);
  if (error) return { error: error.message };

  revalidatePath('/resumen');
  return {};
}

/**
 * Obtiene los pedidos abiertos de todas las mesas para el mapa de mesas.
 */
export async function getPedidosAbiertoPorMesa() {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('pedidos')
    .select('mesa_id, total, id')
    .eq('estado', 'abierto')
    .eq('tipo', 'mesa');

  return data || [];
}
