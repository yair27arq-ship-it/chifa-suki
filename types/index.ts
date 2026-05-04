// ============================================================
// CHIFA SUKI POS — TypeScript Types
// ============================================================

export type CategoriaMenu = {
  id: number;
  nombre: string;
  orden: number;
};

export type OpcionPrecio = {
  label: string;
  precio: number;
};

export type Plato = {
  id: number;
  categoria_id: number;
  nombre: string;
  precio: number;
  opciones_precio: OpcionPrecio[] | null;
  activo: boolean;
  orden: number;
  seccion: string | null;
  descripcion: string | null;
};

export type Mesa = {
  id: number;
  numero: number;
  nombre: string | null;
  activa: boolean;
};

export type EstadoPedido = 'abierto' | 'cobrado' | 'anulado';
export type TipoPedido = 'mesa' | 'llevar';

export type MetodoPago = 'efectivo' | 'yape' | 'tarjeta' | 'mixto';

export interface PagoParte {
  metodo: 'efectivo' | 'yape' | 'tarjeta';
  monto: number;
  montoRecibido?: number;
}

export type Pedido = {
  id: string;
  tipo: TipoPedido;
  mesa_id: number | null;
  numero_orden: number | null;
  estado: EstadoPedido;
  total: number;
  created_at: string;
  cobrado_at: string | null;
  fecha_dia: string;
  metodo_pago: MetodoPago | null;
  pago_partes?: PagoParte[] | null;
  jornada: number;
  mesas?: Mesa;
  pedido_items?: PedidoItem[];
};

export type PedidoItem = {
  id: number;
  pedido_id: string;
  plato_id: number;
  nombre_plato: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  opcion_label: string | null;
  notas: string | null;
};

export type CierreDia = {
  id: number;
  fecha: string;
  jornada: number;
  total_mesas: number;
  total_llevar: number;
  total_general: number;
  num_pedidos: number;
  created_at: string;
};

// ============================================================
// Inventario
// ============================================================

export type Insumo = {
  id: number;
  nombre: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  activo: boolean;
};

export type RecetaItem = {
  id: number;
  receta_id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
};

export type Receta = {
  id: number;
  nombre: string;
  activo: boolean;
  pasos?: string[];
  receta_items?: RecetaItem[];
};

// ============================================================
// Zustand Store
// ============================================================

export type ItemCarrito = {
  plato_id: number;
  nombre_plato: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  opcion_label: string | null;
  notas?: string | null;
  isCustom?: boolean;
  descripcion?: string | null;
};
