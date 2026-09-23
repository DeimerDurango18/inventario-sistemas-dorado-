import { useEffect, useState } from "react";
import api from "../../api/client";

const VACIO = { id: null, documento: "", nombre: "", cargo: "", telefono: "", correo: "", sede_id: "", activo: true };

export default function ResponsablesModal({ show, onClose }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [sedes, setSedes] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [r, s] = await Promise.all([
      api.get("/activos/responsables"),
      api.get("/geo/sedes"),
    ]);
    setItems(r.data || []);
    setSedes(s.data || []);
  };

  useEffect(() => {
    if (show) load();
  }, [show]);

  if (!show) return null;

  const editar = (r) => setForm({ ...VACIO, ...r, sede_id: r.sede_id ?? "" });

  const reset = () => {
    setForm(VACIO);
    setError("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const body = { ...form, sede_id: form.sede_id || null };
    delete body.id;
    try {
      if (form.id) await api.put(`/activos/responsables/${form.id}`, body);
      else await api.post("/activos/responsables", body);
      reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,.45)" }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title"><i className="bi bi-people me-1"></i> Responsables</h6>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={guardar} className="card stat-card p-2 mb-3">
              <div className="row g-2">
                {form.id && (
                  <div className="col-12">
                    <span className="badge eta-badge mb-1" style={{ background: "#0b66c217", color: "#0b66c2" }}>
                      Editando: {form.nombre}
                    </span>
                  </div>
                )}
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Teléfono" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Correo" type="email" value={form.correo || ""} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={form.sede_id} onChange={(e) => setForm({ ...form, sede_id: e.target.value })}>
                    <option value="">Sede</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                {form.id && (
                  <div className="col-md-3 d-flex align-items-center">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="resActivo" checked={!!form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                      <label className="form-check-label small" htmlFor="resActivo">Activo</label>
                    </div>
                  </div>
                )}
                <div className="col-md-3 d-flex gap-1">
                  <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }} disabled={busy}>
                    {busy ? "Guardando…" : form.id ? "Guardar" : "Crear"}
                  </button>
                  {form.id && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reset}>Nuevo</button>}
                </div>
              </div>
              {error && <div className="text-danger small mt-2">{error}</div>}
            </form>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light"><tr><th>Documento</th><th>Nombre</th><th>Cargo</th><th>Sede</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.documento || "—"}</td>
                      <td className="fw-semibold">{r.nombre}</td>
                      <td>{r.cargo || "—"}</td>
                      <td className="small">{sedes.find((s) => s.id === r.sede_id)?.nombre || "—"}</td>
                      <td>
                        <span className="badge eta-badge" style={{ background: r.activo ? "#17b26a1c" : "#64748b1c", color: r.activo ? "#17b26a" : "#64748b" }}>
                          {r.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" title="Editar" onClick={() => editar(r)}><i className="bi bi-pencil text-primary"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}