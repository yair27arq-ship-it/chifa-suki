'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Package, BookOpen, X, ChevronDown, ChefHat } from 'lucide-react';
import { DrawerToggle } from '@/components/DrawerToggle';
import {
  getInsumos, createInsumo, updateInsumo, deleteInsumo,
  getRecetas, createReceta, updateReceta, deleteReceta,
} from '@/actions/inventario';
import type { Insumo, Receta } from '@/types';

const UNIDADES_INGREDIENTE = ['g', 'kg', 'mL', 'L', 'taza', 'cdta', 'cda', 'unidad', 'pizca', 'al gusto'];
const UNIDADES = ['kg', 'g', 'L', 'mL', 'unidad', 'caja', 'bolsa', 'lata', 'docena'];

function emptyInsumo() {
  return { nombre: '', unidad: 'kg', stock_actual: 0, stock_minimo: 0, costo_unitario: 0 };
}

type RecetaItemDraft = { nombre: string; cantidad: number; unidad: string };

function emptyReceta() {
  return { nombre: '', pasos: [] as string[], items: [] as RecetaItemDraft[] };
}

// ── InsumoModal ───────────────────────────────────────────────

function InsumoModal({ initial, onClose, onSaved }: { initial?: Insumo; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial ? {
    nombre: initial.nombre, unidad: initial.unidad,
    stock_actual: initial.stock_actual, stock_minimo: initial.stock_minimo, costo_unitario: initial.costo_unitario,
  } : emptyInsumo());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    const res = initial ? await updateInsumo(initial.id, form) : await createInsumo(form);
    if (res.error) { setError(res.error); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="inv-modal-backdrop" onClick={onClose}>
      <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <span className="inv-modal-title">{initial ? 'Editar insumo' : 'Nuevo insumo'}</span>
          <button className="inv-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="inv-modal-body">
          <label className="inv-label">Nombre</label>
          <input className="inv-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Arroz" />
          <label className="inv-label">Unidad</label>
          <select className="inv-input" value={form.unidad} onChange={(e) => set('unidad', e.target.value)}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <div className="inv-row3">
            <div>
              <label className="inv-label">Stock actual</label>
              <input className="inv-input" type="number" min="0" step="0.01" value={form.stock_actual} onChange={(e) => set('stock_actual', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="inv-label">Stock mínimo</label>
              <input className="inv-input" type="number" min="0" step="0.01" value={form.stock_minimo} onChange={(e) => set('stock_minimo', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="inv-label">Costo unitario (S/)</label>
              <input className="inv-input" type="number" min="0" step="0.01" value={form.costo_unitario} onChange={(e) => set('costo_unitario', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          {error && <p className="inv-error">{error}</p>}
        </div>
        <div className="inv-modal-footer">
          <button className="inv-btn-secondary" onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RecetaModal ───────────────────────────────────────────────

function RecetaModal({ initial, onClose, onSaved }: { initial?: Receta; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial ? {
    nombre: initial.nombre, pasos: initial.pasos ?? [],
    items: (initial.receta_items ?? []).map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad })),
  } : emptyReceta());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { nombre: '', cantidad: 1, unidad: 'g' }] }));
  const updateItem = (idx: number, k: keyof RecetaItemDraft, v: string | number) =>
    setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], [k]: v }; return { ...f, items }; });
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const addPaso = () => setForm((f) => ({ ...f, pasos: [...f.pasos, ''] }));
  const updatePaso = (idx: number, v: string) =>
    setForm((f) => { const pasos = [...f.pasos]; pasos[idx] = v; return { ...f, pasos }; });
  const removePaso = (idx: number) => setForm((f) => ({ ...f, pasos: f.pasos.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    const payload = { nombre: form.nombre, pasos: form.pasos.filter((p) => p.trim() !== ''), items: form.items.filter((it) => it.nombre.trim() !== '') };
    const res = initial ? await updateReceta(initial.id, payload) : await createReceta(payload);
    if (res.error) { setError(res.error); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="inv-modal-backdrop" onClick={onClose}>
      <div className="inv-modal inv-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <span className="inv-modal-title">{initial ? 'Editar receta' : 'Nueva receta'}</span>
          <button className="inv-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="inv-modal-body">
          <label className="inv-label">Nombre de la receta</label>
          <input className="inv-input" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Arroz chaufa de pollo" />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <span className="inv-label" style={{ marginBottom: 0 }}>Ingredientes</span>
            <button onClick={addItem} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--t1)', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '4px 10px', cursor: 'pointer', height: 26 }}>
              <Plus size={13} /> Agregar
            </button>
          </div>
          {form.items.length === 0 && <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', padding: '10px 0' }}>Sin ingredientes aún</p>}
          {form.items.map((item, idx) => (
            <div key={idx} className="inv-item-row" style={{ gap: 6 }}>
              <input className="inv-input" style={{ flex: 1 }} value={item.nombre} onChange={(e) => updateItem(idx, 'nombre', e.target.value)} placeholder="Ej: Arroz, Aceite…" />
              <input className="inv-input inv-input-qty" type="number" min="0" step="0.01" value={item.cantidad} onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)} />
              <div className="inv-select-wrap" style={{ minWidth: 80 }}>
                <select className="inv-input" value={item.unidad} onChange={(e) => updateItem(idx, 'unidad', e.target.value)}>
                  {UNIDADES_INGREDIENTE.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown size={14} className="inv-select-icon" />
              </div>
              <button className="inv-item-remove" onClick={() => removeItem(idx)}><X size={14} /></button>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <span className="inv-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChefHat size={14} style={{ opacity: 0.7 }} /> Pasos de preparación
            </span>
            <button onClick={addPaso} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--t1)', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '4px 10px', cursor: 'pointer', height: 26 }}>
              <Plus size={13} /> Agregar paso
            </button>
          </div>
          {form.pasos.length === 0 && <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', padding: '10px 0' }}>Sin pasos aún</p>}
          {form.pasos.map((paso, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginTop: 7 }}>{idx + 1}</span>
              <textarea className="inv-input" style={{ flex: 1, resize: 'vertical', minHeight: 56, paddingTop: 8, paddingBottom: 8 }} value={paso} onChange={(e) => updatePaso(idx, e.target.value)} placeholder={`Paso ${idx + 1}…`} />
              <button className="inv-item-remove" style={{ marginTop: 7 }} onClick={() => removePaso(idx)}><X size={14} /></button>
            </div>
          ))}
          {error && <p className="inv-error">{error}</p>}
        </div>
        <div className="inv-modal-footer">
          <button className="inv-btn-secondary" onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmDelete ─────────────────────────────────────────────

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

// ── InventarioClient ──────────────────────────────────────────

type Tab = 'insumos' | 'recetas';

export function InventarioClient({
  initialInsumos,
  initialRecetas,
}: {
  initialInsumos: Insumo[];
  initialRecetas: Receta[];
}) {
  const [tab, setTab] = useState<Tab>('insumos');
  const [insumos, setInsumos] = useState<Insumo[]>(initialInsumos);
  const [recetas, setRecetas] = useState<Receta[]>(initialRecetas);

  const [insumoEdit, setInsumoEdit] = useState<Insumo | null | 'new'>(null);
  const [recetaEdit, setRecetaEdit] = useState<Receta | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ tipo: 'insumo' | 'receta'; id: number; nombre: string } | null>(null);

  const cargar = async () => {
    const [ins, rec] = await Promise.all([getInsumos(), getRecetas()]);
    setInsumos(ins);
    setRecetas(rec);
  };

  const handleDeleted = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.tipo === 'insumo') await deleteInsumo(deleteTarget.id);
    else await deleteReceta(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  return (
    <div>
      <div className="page-header" />
      <div className="content-top-row">
        <DrawerToggle />
        <h1 className="page-title">Inventario</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', borderBottom: '1px solid var(--bd)' }}>
        {(['insumos', 'recetas'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: tab === t ? 600 : 500, color: tab === t ? 'var(--t1)' : 'var(--t2)', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--t1)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t === 'insumos' ? <Package size={15} /> : <BookOpen size={15} />}
            {t === 'insumos' ? 'Insumos' : 'Recetas'}
          </button>
        ))}
      </div>

      {tab === 'insumos' && (
        <div className="inv-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>{insumos.length} insumos</span>
            <button onClick={() => setInsumoEdit('new')} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> Nuevo insumo
            </button>
          </div>
          {insumos.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Package size={28} /></div><p className="empty-state-text">Sin insumos registrados</p></div>
          ) : (
            <div className="resumen-table-wrap">
              <table className="resumen-table">
                <thead><tr><th>Nombre</th><th>Unidad</th><th>Stock actual</th><th>Stock mínimo</th><th>Costo unit.</th><th></th></tr></thead>
                <tbody>
                  {insumos.map((ins) => {
                    const bajo = ins.stock_actual <= ins.stock_minimo;
                    return (
                      <tr key={ins.id}>
                        <td style={{ fontWeight: 600 }}>{ins.nombre}</td>
                        <td style={{ color: 'var(--t2)' }}>{ins.unidad}</td>
                        <td><span style={{ color: bajo ? 'var(--red, #e53e3e)' : 'var(--t1)', fontWeight: bajo ? 600 : 400 }}>{ins.stock_actual}</span></td>
                        <td style={{ color: 'var(--t2)' }}>{ins.stock_minimo}</td>
                        <td style={{ color: 'var(--t2)' }}>S/ {ins.costo_unitario.toFixed(2)}</td>
                        <td>
                          <div className="inv-row-actions">
                            <button className="inv-action-btn" onClick={() => setInsumoEdit(ins)}><Pencil size={13} /></button>
                            <button className="inv-action-btn inv-action-danger" onClick={() => setDeleteTarget({ tipo: 'insumo', id: ins.id, nombre: ins.nombre })}><Trash2 size={13} /></button>
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

      {tab === 'recetas' && (
        <div className="inv-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>{recetas.length} recetas</span>
            <button onClick={() => setRecetaEdit('new')} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'var(--t1)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> Nueva receta
            </button>
          </div>
          {recetas.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><BookOpen size={28} /></div><p className="empty-state-text">Sin recetas registradas</p></div>
          ) : (
            <div className="receta-grid">
              {recetas.map((rec) => {
                const items = rec.receta_items ?? [];
                return (
                  <div key={rec.id} className="receta-card">
                    <div className="receta-card-top">
                      <div className="receta-card-icon"><BookOpen size={16} strokeWidth={1.5} /></div>
                      <div className="receta-card-actions">
                        <button className="inv-action-btn" onClick={() => setRecetaEdit(rec)}><Pencil size={13} /></button>
                        <button className="inv-action-btn inv-action-danger" onClick={() => setDeleteTarget({ tipo: 'receta', id: rec.id, nombre: rec.nombre })}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <p className="receta-card-nombre">{rec.nombre}</p>
                    <p className="receta-card-meta">
                      {items.length} ingrediente{items.length !== 1 ? 's' : ''}
                      {(rec.pasos?.length ?? 0) > 0 && ` · ${rec.pasos!.length} paso${rec.pasos!.length !== 1 ? 's' : ''}`}
                    </p>
                    {items.length > 0 && (
                      <ul className="receta-card-items">
                        {items.map((it) => (
                          <li key={it.id} className="receta-card-item">
                            <span className="receta-card-item-dot" />
                            <span>{it.nombre}</span>
                            <span className="receta-card-item-qty">{it.cantidad} {it.unidad}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(rec.pasos?.length ?? 0) > 0 && (
                      <ol className="receta-card-pasos">
                        {rec.pasos!.map((paso, i) => <li key={i} className="receta-card-paso">{paso}</li>)}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {insumoEdit !== null && (
        <InsumoModal initial={insumoEdit === 'new' ? undefined : insumoEdit} onClose={() => setInsumoEdit(null)} onSaved={() => { setInsumoEdit(null); cargar(); }} />
      )}
      {recetaEdit !== null && (
        <RecetaModal initial={recetaEdit === 'new' ? undefined : recetaEdit} onClose={() => setRecetaEdit(null)} onSaved={() => { setRecetaEdit(null); cargar(); }} />
      )}
      {deleteTarget && (
        <ConfirmDelete nombre={deleteTarget.nombre} onConfirm={handleDeleted} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
