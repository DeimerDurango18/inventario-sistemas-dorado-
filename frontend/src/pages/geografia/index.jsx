import { useEffect, useState } from "react";
import api from "../../api/client";

function TabSedes() {
  const [items, setItems] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [form, setForm] = useState({ nombre: "", codigo: "", direccion: "", telefono: "", activo: true, ciudad_id: "", tipo_ubicacion_id: "" });
  const [tipos, setTipos] = useState([]);
  const load = async () => {
    const [s, c, t] = await Promise.all([
      api.get("/geo/sedes").catch(() => ({ data: [] })),
      api.get("/geo/ciudades?limit=2000").catch(() => ({ data: [] })),
      api.get("/geo/tipos-ubicacion"),
    ]);
    setItems(s.data || []);
    setCiudades(c.data || []);
    setTipos(t.data || []);
  };
  useEffect(load, []);

  const crear = async (e) => {
    e.preventDefault();
    await api.post("/geo/sedes", {
      ...form,
      activo: true,
      ciudad_id: form.ciudad_id || null,
      tipo_ubicacion_id: form.tipo_ubicacion_id || null,
    });
    setForm({ nombre: "", codigo: "", direccion: "", telefono: "", activo: true, ciudad_id: "", tipo_ubicacion_id: "" });
    load();
  };

  return (
    <div>
      <form onSubmit={crear} className="row g-2 mb-2">
        <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="CÃ³digo (SEDE-01)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="DirecciÃ³n" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="TelÃ©fono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={form.ciudad_id} onChange={(e) => setForm({ ...form, ciudad_id: e.target.value })}>
            <option value="">Ciudad *</option>
            {ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="col-md-1">
          <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm mb-0">
          <thead className="table-light"><tr><th>CÃ³digo</th><th>Nombre</th><th>Ciudad</th><th>DirecciÃ³n</th><th>Estado</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="text-center text-secondary py-3">Sin sedes</td></tr>}
            {items.map((s) => (
              <tr key={s.id}>
                <td className="fw-semibold">{s.codigo}</td>
                <td>{s.nombre}</td>
                <td>{s.ciudad?.nombre || "â€”"}</td>
                <td>{s.direccion || "â€”"}</td>
                <td>{s.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabUbicaciones() {
  const [items, setItems] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState({ nombre: "", codigo: "", descripcion: "", sede_id: "", tipo_ubicacion_id: "" });
  const load = async () => {
    const [u, s, t] = await Promise.all([
      api.get("/geo/ubicaciones").catch(() => ({ data: [] })),
      api.get("/geo/sedes").catch(() => ({ data: [] })),
      api.get("/geo/tipos-ubicacion"),
    ]);
    setItems(u.data || []);
    setSedes(s.data || []);
    setTipos(t.data || []);
  };
  useEffect(load, []);

  const crear = async (e) => {
    e.preventDefault();
    await api.post("/geo/ubicaciones", {
      ...form,
      sede_id: form.sede_id || null,
      tipo_ubicacion_id: form.tipo_ubicacion_id || null,
    });
    setForm({ nombre: "", codigo: "", descripcion: "", sede_id: "", tipo_ubicacion_id: "" });
    load();
  };

  return (
    <div>
      <form onSubmit={crear} className="row g-2 mb-2">
        <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="CÃ³digo" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={form.sede_id} onChange={(e) => setForm({ ...form, sede_id: e.target.value })}>
            <option value="">Sede</option>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={form.tipo_ubicacion_id} onChange={(e) => setForm({ ...form, tipo_ubicacion_id: e.target.value })}>
            <option value="">Tipo ubicaciÃ³n</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2">
          <input className="form-control form-control-sm" placeholder="DescripciÃ³n" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm mb-0">
          <thead className="table-light"><tr><th>ID</th><th>CÃ³digo</th><th>Nombre</th><th>Sede</th><th>Tipo</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="text-center text-secondary py-3">Sin ubicaciones</td></tr>}
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.codigo || "â€”"}</td>
                <td>{u.nombre}</td>
                <td>{u.sede?.nombre || "â€”"}</td>
                <td>{u.tipo_ubicacion?.nombre || "â€”"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Geografia() {
  const [tab, setTab] = useState("sedes");
  return (
    <div>
      <h5 className="mb-3">Sedes y ubicaciones</h5>
      <div className="card stat-card">
        <div className="card-header bg-white">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item"><button className={`nav-link ${tab === "sedes" ? "active" : ""}`} onClick={() => setTab("sedes")}>Sedes</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === "ubicaciones" ? "active" : ""}`} onClick={() => setTab("ubicaciones")}>Ubicaciones</button></li>
          </ul>
        </div>
        <div className="card-body">
          {tab === "sedes" && <TabSedes />}
          {tab === "ubicaciones" && <TabUbicaciones />}
        </div>
      </div>
    </div>
  );
}