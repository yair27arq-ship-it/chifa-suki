'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getPedidoPorId } from '@/actions/pedidos';
import { usePedidoStore } from '@/lib/store';
import { usePedido } from '@/hooks/usePedido';
import { MenuModal } from '@/components/MenuModal';
import { PedidoPanel } from '@/components/PedidoPanel';
import { PlatosGrid } from '@/components/PlatosGrid';
import { ItemPersonalizadoModal } from '@/components/ItemPersonalizadoModal';
import { printTicket } from '@/lib/printTicket';

import type { CategoriaMenu, MetodoPago, PagoParte, Plato } from '@/types';
import { formatPrecio } from '@/lib/utils';
import { ChevronLeft, Printer } from 'lucide-react';

// Lazy load de modales pesados — solo se descargan cuando se necesitan
const CobrarModal = dynamic(() => import('@/components/CobrarModal').then((m) => ({ default: m.CobrarModal })));
const CuentaCompartidaModal = dynamic(() => import('@/components/CuentaCompartidaModal').then((m) => ({ default: m.CuentaCompartidaModal })));
const PrinterModal = dynamic(() => import('@/components/PrinterModal').then((m) => ({ default: m.PrinterModal })));

type PedidoData = NonNullable<Awaited<ReturnType<typeof getPedidoPorId>>>;

interface Props {
  ordenId: string;
  initialCategorias: CategoriaMenu[];
  initialPlatos: Plato[];
  initialPedido: PedidoData;
}

export function LlevarPedidoClient({ ordenId, initialCategorias, initialPlatos, initialPedido }: Props) {
  const router = useRouter();

  const [categorias] = useState<CategoriaMenu[]>(initialCategorias);
  const [platos] = useState<Plato[]>(initialPlatos);
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(initialCategorias[0]?.id ?? null);
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null);
  const [numeroOrden] = useState<number | null>(initialPedido.numero_orden);

  const [showConfirmAnular, setShowConfirmAnular] = useState(false);
  const [showCobrarModal, setShowCobrarModal] = useState(false);
  const [showDividirModal, setShowDividirModal] = useState(false);
  const [showItemPersonalizadoModal, setShowItemPersonalizadoModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  const { setPedidoId, cargarDesdeDB } = usePedidoStore();
  const { items, total, isPending, agregar, quitar, actualizarItem, cobrar, anular, notasItem } =
    usePedido('llevar', null, numeroOrden);

  // Inicializar carrito desde props (sin fetch — datos ya disponibles)
  useEffect(() => {
    setPedidoId(initialPedido.id);
    if (initialPedido.pedido_items) {
      cargarDesdeDB(initialPedido.pedido_items);
    }
    return () => usePedidoStore.getState().limpiarCarrito();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenId]);

  const platosFiltrados = platos.filter((p) => p.categoria_id === categoriaActiva);

  const itemsConDesc = useCallback(
    () => items.map((item) => ({
      ...item,
      descripcion: platos.find((p) => p.id === item.plato_id)?.descripcion ?? null,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  const guardar = useCallback(() => {
    printTicket({
      tipo: 'cocina',
      numeroOrden,
      items: itemsConDesc(),
      total,
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  }, [numeroOrden, itemsConDesc, total]);

  const imprimirCuenta = useCallback((metodoPago: MetodoPago | null, montoRecibido?: number, pagoPartes?: PagoParte[]) => {
    printTicket({
      tipo: 'llevar',
      numeroOrden,
      items: itemsConDesc(),
      total,
      timestamp: new Date().toISOString(),
      metodoPago: metodoPago ?? undefined,
      montoRecibido,
      pagoPartes,
    }).catch(console.error);
  }, [numeroOrden, itemsConDesc, total]);

  const handleCobrar = async (metodoPago: MetodoPago, montoRecibido?: number, pagoPartes?: PagoParte[]) => {
    setShowCobrarModal(false);
    imprimirCuenta(metodoPago, montoRecibido, pagoPartes);
    await cobrar(metodoPago, pagoPartes);
  };

  const handleAnularConfirmado = async () => {
    setShowConfirmAnular(false);
    await anular();
  };

  return (
    <>
      <div className="page-header" />

      <div className="content-top-row">
        <button onClick={() => router.push('/llevar')} className="back-btn" aria-label="Volver">
          <ChevronLeft size={22} />
        </button>
        <h1 className="page-title">Orden #{numeroOrden}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--t2)' }}>{formatPrecio(total)}</span>
          <button onClick={() => setShowPrinterModal(true)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', cursor: 'pointer' }} aria-label="Configurar impresora">
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        {categorias.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${categoriaActiva === cat.id ? 'active' : ''}`}
            onClick={() => setCategoriaActiva(cat.id)}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Platos grid */}
      <div className="menu-scroll-area">
        <PlatosGrid
          platos={platosFiltrados}
          onSelect={setPlatoSeleccionado}
          mostrarSecciones={categorias.find((c) => c.id === categoriaActiva)?.nombre !== 'Menú+entrada'}
        />
      </div>

      {/* Pedido panel */}
      <PedidoPanel
        items={items}
        total={total}
        isPending={isPending}
        onActualizar={actualizarItem}
        onQuitar={quitar}
        onCobrar={() => setShowCobrarModal(true)}
        onDividir={() => setShowDividirModal(true)}
        onAnular={() => setShowConfirmAnular(true)}
        onGuardar={guardar}
        onAgregarPersonalizado={() => setShowItemPersonalizadoModal(true)}
        onNotasItem={notasItem}
        tipo="llevar"
      />

      {/* Modal de plato */}
      <MenuModal
        plato={platoSeleccionado}
        onClose={() => setPlatoSeleccionado(null)}
        onAgregar={agregar}
        esMenuConEntrada={
          platoSeleccionado !== null &&
          categorias.find((c) => c.id === platoSeleccionado.categoria_id)?.nombre === 'Menú+entrada'
        }
      />

      {/* Confirm anular */}
      {showConfirmAnular && (
        <div className="confirm-backdrop">
          <div className="confirm-box">
            <h2 className="confirm-title">¿Anular orden?</h2>
            <p className="confirm-desc">Esta acción no se puede deshacer.</p>
            <div className="confirm-actions">
              <button className="btn-confirm-cancel" onClick={() => setShowConfirmAnular(false)}>
                Cancelar
              </button>
              <button className="btn-confirm-ok" onClick={handleAnularConfirmado}>
                Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ítem personalizado modal */}
      {showItemPersonalizadoModal && (
        <ItemPersonalizadoModal
          onClose={() => setShowItemPersonalizadoModal(false)}
          onAgregar={agregar}
        />
      )}

      {/* Cobrar modal */}
      {showCobrarModal && (
        <CobrarModal
          total={total}
          mesaNombre={`Orden #${numeroOrden}`}
          items={items}
          onClose={() => setShowCobrarModal(false)}
          onImprimir={imprimirCuenta}
          onCobrar={handleCobrar}
          isPending={isPending}
        />
      )}

      {/* Printer modal */}
      {showPrinterModal && (
        <PrinterModal onClose={() => setShowPrinterModal(false)} />
      )}

      {/* Dividir cuenta modal */}
      {showDividirModal && (
        <CuentaCompartidaModal
          total={total}
          mesaNombre={`Orden #${numeroOrden}`}
          items={items}
          onClose={() => setShowDividirModal(false)}
          onCobrar={handleCobrar}
          isPending={isPending}
        />
      )}
    </>
  );
}
