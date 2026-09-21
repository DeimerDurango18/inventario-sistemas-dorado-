import { useEffect, useState } from "react";
import api from "../../api/client";

export default function ResponsablesModal({ show, onClose }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ documento: "", nombre: "", cargo: "", sede_id: "" });
  const [sedes, setSedes] = useState([]);
  const [error, setError] = useState("");

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

  const crear = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/activos/responsables", {
        ...form,
        sede_id: form.sede_id || null,
      });
      setForm({ documento: "", nombre: "", cargo: "", sede_id: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,.45)" }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title">Responsables</h6>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={crear} className="card stat-card p-2 mb-3">
              <div className="row g-2">
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} required /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div className="col-md-2">
                  <select className="form-select form-select-sm" value={form.sede_id} onChange={(e) => setForm({ ...form, sede_id: e.target.value })}>
                    <option value="">Sede</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="col-md-1"><button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button></div>
              </div>
              {error && <div className="text-danger small mt-2">{error}</div>}
            </form>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light"><tr><th>Documento</th><th>Nombre</th><th>Cargo</th><th>Sede id</th></tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}><td>{r.documento}</td><td>{r.nombre}</td><td>{r.cargo}</td><td>{r.sede_id || "â€”"}</td></tr>
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