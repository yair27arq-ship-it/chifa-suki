'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown, UtensilsCrossed, Tag } from 'lucide-react';
import { DrawerToggle } from '@/components/DrawerToggle';
import {
  getMenuAdmin, createPlato, updatePlato, deletePlato,
  createCategoria, updateCategoria, deleteCategoria,
} from '@/actions/platos';
import type { CategoriaMenu, Plato, OpcionPrecio } from '@/types';

type PlatoForm = {
  categoria_id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  seccion: string;
  orden: number;
  activo: boolean;
  opciones_precio: OpcionPrecio[];
};

function emptyPlato(categoria_id: number): PlatoForm {
  return { categoria_id, nombre: '', precio: 0, descripcion: '', seccion: '', orden: 0, activo: true, opciones_precio: [] };
}

function PlatoModal({ initial, categorias, onClose, onSaved }: { initial?: Plato; categorias: CategoriaMenu[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PlatoForm>(initial ? {
    categoria_id: initial.categoria_id, nombre: initial.nombre, precio: initial.precio,
    descripcion: initial.descripcion ?? '', seccion: initial.seccion ?? '', orden: initial.orden,
    activo: initial.activo, opciones_precio: initial.opciones_precio ?? [],
  } : emptyPlato(categorias[0]?.id ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof PlatoForm, v: string | number | boolean | OpcionPrecio[]) => setForm((f) => ({ ...f, [k]: v }));
  const addOpcion = () => set('opciones_precio', [...form.opciones_precio, { label: '', precio: 0 }]);
  const updateOpcion = (idx: number, k: keyof OpcionPrecio, v: string | number) =>
    set('opciones_precio', form.opciones_precio.map((o, i) => i === idx ? { ...o, [k]: v } : o));
  const removeOpcion = (idx: number) => set('opciones_precio', form.opciones_precio.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    if (form.categoria_id === 0) { setError('Selecciona una categoría'); return; }
    setSaving(true);
    const payload = { ...form, opciones_precio: form.opciones_precio.length > 0 ? form.opciones_precio : null };
    const res = initial ? await updatePlato(initial.id, payload) : await createPlato(payload);
    if (res.error) { setError(res.error); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="inv-modal-backdrop" onClick={onClose}>
      <div className="inv-modal inv-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <span className="inv-modal-title">{initial ? 'Editar plato' : 'Nuevo plato'}</span>
          <button className="inv-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="inv-modal-body">
          <label className="inv-label">Nombre</label>
          <input className="inv-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Arroz chaufa de pollo" />

          <label className="inv-label" style={{ marginTop: 10 }}>Categoría</label>
          <div className="inv-select-wrap">
            <select className="inv-input" value={form.categoria_id} onChange={(e) => set('categoria_id', parseInt(e.target.value))}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <ChevronDown size={14} className="inv-select-icon" />
          </div>

          <div className="inv-row3" style={{ marginTop: 10 }}>
            <div>
              <label className="inv-label">Precio (S/)</label>
              <input className="inv-input" type="number" min="0" step="0.01" value={form.precio} onChange={(e) => set('precio', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="inv-label">Orden</label>
              <input className="inv-input" type="number" min="0" value={form.orden} onChange={(e) => set('orden', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="inv-label">Sección (opcional)</label>
              <input className="inv-input" value={form.seccion} onChange={(e) => set('seccion', e.target.value)} placeholder="Ej: Especiales" />
            </div>
          </div>

          <label className="inv-label" style={{ marginTop: 10 }}>Descripción (opcional)</label>
          <textarea className="inv-input" style={{ resize: 'vertical', minHeight: 60, paddingTop: 8, paddingBottom: 8 }} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Descripción breve del plato…" />

          {initial && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <label className="inv-label" style={{ marginBottom: 0 }}>Estado</label>
              <button type="button" onClick={() => set('activo', !form.activo)} style={{ height: 28, padding: '0 12px', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--bd)', background: form.activo ? '#DCFCE7' : '#FEE2E2', color: form.activo ? '#16A34A' : '#DC2626' }}>
                {form.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <span className="inv-label" style={{ marginBottom: 0 }}>Opciones de precio</span>
            <button onClick={addOpcion} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--t1)', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '4px 10px', cursor: 'pointer', height: 26 }}>
              <Plus size={13} /> Agregar opción
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Si el plato tiene múltiples tamaños o variantes con precio distinto, agrégalas aquí.</p>
          {form.opciones_precio.map((op, idx) => (
            <div key={idx} className="inv-item-row" style={{ gap: 6 }}>
              <input className="inv-input" style={{ flex: 1 }} value={op.label} onChange={(e) => updateOpcion(idx, 'label', e.target.value)} placeholder="Ej: 6 uds, Grande…" />
              <input className="inv-input inv-input-qty" type="number" min="0" step="0.01" value={op.precio} onChange={(e) => updateOpcion(idx, 'precio', parseFloat(e.target.value) || 0)} />
              <button className="inv-item-remove" onClick={() => removeOpcion(idx)}><X size={14} /></button>
            </div>
          ))}
          {error && <p className="inv-error">{error}</p>}
        </div>
        <div className="inv-modal-footer">
          <button className="inv-btn-secondary" onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoriaModal({ initial, onClose, onSaved }: { initial?: CategoriaMenu; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    const res = initial ? await updateCategoria(initial.id, nombre.trim()) : await createCategoria(nombre.trim());
    if (res.error) { setError(res.error); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="inv-modal-backdrop" onClick={onClose}>
      <div className="inv-modal inv-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <span className="inv-modal-title">{initial ? 'Editar categoría' : 'Nueva categoría'}</span>
          <button className="inv-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="inv-modal-body">
          <label className="inv-label">Nombre</label>
          <input className="inv-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: A la carta" autoFocus />
          {error && <p className="inv-error">{error}</p>}
        </div>
        <div className="inv-modal-footer">
          <button className="inv-btn-secondary" onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ height: 36, padding: '0 14px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ nombre, onConfirm, onCancel }: { nombre: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="inv-modal-backdrop" onClick={onCancel}>
      <div className="inv-modal inv-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <span className="inv-modal-title">Eliminar</span>
          <button className="inv-modal-close" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="inv-modal-body">
          <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
            ¿Eliminar <strong style={{ color: 'var(--t1)' }}>{nombre}</strong>? Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="inv-modal-footer">
          <button className="inv-btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="inv-btn-danger" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

type Tab = 'platos' | 'categorias';

export function MenuClient({
  initialCategorias,
  initialPlatos,
}: {
  initialCategorias: CategoriaMenu[];
  initialPlatos: Plato[];
}) {
  const [tab, setTab] = useState<Tab>('platos');
  const [categorias, setCategorias] = useState<CategoriaMenu[]>(initialCategorias);
  const [platos, setPlatos] = useState<Plato[]>(initialPlatos);
  const [catFiltro, setCatFiltro] = useState<number | 'todos'>('todos');

  const [platoEdit, setPlatoEdit] = useState<Plato | null | 'new'>(null);
  const [catEdit, setCatEdit] = useState<CategoriaMenu | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ tipo: 'plato' | 'categoria'; id: number; nombre: string } | null>(null);

  const cargar = async () => {
    const { categorias: cats, platos: pls } = await getMenuAdmin();
    setCategorias(cats);
    setPlatos(pls);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.tipo === 'plato') await deletePlato(deleteTarget.id);
    else await deleteCategoria(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  const platosFiltrados = catFiltro === 'todos' ? platos : platos.filter((p) => p.categoria_id === catFiltro);
  const nombreCategoria = (id: number) => categorias.find((c) => c.id === id)?.nombre ?? '—';

  return (
    <div>
      <div className="page-header" />
      <div className="content-top-row">
        <DrawerToggle />
        <h1 className="page-title">Menú</h1>
        <button onClick={() => tab === 'platos' ? setPlatoEdit('new') : setCatEdit('new')} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={13} /> {tab === 'platos' ? 'Nuevo plato' : 'Nueva categoría'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', borderBottom: '1px solid var(--bd)' }}>
        {(['platos', 'categorias'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: tab === t ? 600 : 500, color: tab === t ? 'var(--t1)' : 'var(--t2)', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--t1)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t === 'platos' ? <UtensilsCrossed size={15} /> : <Tag size={15} />}
            {t === 'platos' ? 'Platos' : 'Categorías'}
          </button>
        ))}
      </div>

      {tab === 'platos' && (
        <div className="inv-section">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button className={`category-tab${catFiltro === 'todos' ? ' active' : ''}`} onClick={() => setCatFiltro('todos')}>Todos ({platos.length})</button>
            {categorias.map((c) => {
              const count = platos.filter((p) => p.categoria_id === c.id).length;
              return <button key={c.id} className={`category-tab${catFiltro === c.id ? ' active' : ''}`} onClick={() => setCatFiltro(c.id)}>{c.nombre} ({count})</button>;
            })}
          </div>
          {platosFiltrados.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><UtensilsCrossed size={28} /></div><p className="empty-state-text">Sin platos en esta categoría</p></div>
          ) : (
            <div className="resumen-table-wrap">
              <table className="resumen-table">
                <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Sección</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {platosFiltrados.map((p) => (
                    <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                        {p.descripcion && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{p.descripcion}</div>}
                        {p.opciones_precio && p.opciones_precio.length > 0 && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{p.opciones_precio.map((o) => `${o.label}: S/${o.precio.toFixed(2)}`).join(' · ')}</div>}
                      </td>
                      <td style={{ color: 'var(--t2)' }}>{nombreCategoria(p.categoria_id)}</td>
                      <td style={{ fontWeight: 600 }}>S/ {p.precio.toFixed(2)}</td>
                      <td style={{ color: 'var(--t2)' }}>{p.seccion || '—'}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: p.activo ? '#DCFCE7' : '#FEE2E2', color: p.activo ? '#16A34A' : '#DC2626' }}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="inv-row-actions">
                          <button className="inv-action-btn" onClick={() => setPlatoEdit(p)}><Pencil size={13} /></button>
                          <button className="inv-action-btn inv-action-danger" onClick={() => setDeleteTarget({ tipo: 'plato', id: p.id, nombre: p.nombre })}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'categorias' && (
        <div className="inv-section">
          {categorias.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Tag size={28} /></div><p className="empty-state-text">Sin categorías registradas</p></div>
          ) : (
            <div className="resumen-table-wrap">
              <table className="resumen-table">
                <thead><tr><th>Nombre</th><th>Orden</th><th>Platos</th><th></th></tr></thead>
                <tbody>
                  {categorias.map((c) => {
                    const count = platos.filter((p) => p.categoria_id === c.id).length;
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                        <td style={{ color: 'var(--t2)' }}>{c.orden}</td>
                        <td style={{ color: 'var(--t2)' }}>{count}</td>
                        <td>
                          <div className="inv-row-actions">
                            <button className="inv-action-btn" onClick={() => setCatEdit(c)}><Pencil size={13} /></button>
                            <button className="inv-action-btn inv-action-danger" onClick={() => setDeleteTarget({ tipo: 'categoria', id: c.id, nombre: c.nombre })}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {platoEdit !== null && <PlatoModal initial={platoEdit === 'new' ? undefined : platoEdit} categorias={categorias} onClose={() => setPlatoEdit(null)} onSaved={() => { setPlatoEdit(null); cargar(); }} />}
      {catEdit !== null && <CategoriaModal initial={catEdit === 'new' ? undefined : catEdit} onClose={() => setCatEdit(null)} onSaved={() => { setCatEdit(null); cargar(); }} />}
      {deleteTarget && <ConfirmDelete nombre={deleteTarget.nombre} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
