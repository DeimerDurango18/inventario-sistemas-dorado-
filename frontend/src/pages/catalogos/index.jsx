import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

function SimpleTable({ columns, rows, empty = "Sin registros" }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0">
        <thead className="table-light"><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="text-center text-secondary py-3">{empty}</td></tr>}
          {rows.map((r) => r)}
        </tbody>
      </table>
    </div>
  );
}

function TabCategorias() {
  const [cats, setCats] = useState([]);
  const [catId, setCatId] = useState("");
  const [nombre, setNombre] = useState("");
  const [sub, setSub] = useState("");
  const load = () => api.get("/catalogo/categorias/todas").then(({ data }) => setCats(data));
  useEffect(load, []);

  const crearCat = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await api.post("/catalogo/categorias", { nombre });
    setNombre("");
    load();
  };
  const crearSub = async (e) => {
    e.preventDefault();
    if (!catId || !sub.trim()) return;
    await api.post("/catalogo/subcategorias", { categoria_id: Number(catId), nombre: sub });
    setSub("");
    load();
  };

  return (
    <div className="row g-3">
      <div className="col-md-5">
        <h6 className="fw-semibold">CategorÃ­as</h6>
        <form onSubmit={crearCat} className="d-flex gap-2 mb-2">
          <input className="form-control form-control-sm" placeholder="Nueva categorÃ­a" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
        </form>
        <SimpleTable
          columns={["ID", "Nombre", "Subs"]}
          rows={cats.map((c) => (
            <tr key={c.id}><td>{c.id}</td><td>{c.nombre}</td><td>{(c.subcategorias || []).length}</td></tr>
          ))}
        />
      </div>
      <div className="col-md-7">
        <h6 className="fw-semibold">SubcategorÃ­as</h6>
        <form onSubmit={crearSub} className="d-flex gap-2 mb-2">
          <select className="form-select form-select-sm" value={catId} onChange={(e) => setCatId(e.target.value)}>
            <option value="">CategorÃ­a</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input className="form-control form-control-sm" placeholder="Nueva subcategorÃ­a" value={sub} onChange={(e) => setSub(e.target.value)} />
          <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
        </form>
        <SimpleTable
          columns={["ID", "CategorÃ­a", "Nombre"]}
          rows={cats.flatMap((c) => (c.subcategorias || []).map((s) => (
            <tr key={s.id}><td>{s.id}</td><td>{c.nombre}</td><td>{s.nombre}</td></tr>
          )))}
        />
      </div>
    </div>
  );
}

function TabMarcas() {
  const [items, setItems] = useState([]);
  const [nombre, setNombre] = useState("");
  const load = () => api.get("/catalogo/marcas?size=500").then(({ data }) => setItems(data.items));
  useEffect(load, []);
  const crear = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await api.post("/catalogo/marcas", { nombre });
    setNombre("");
    load();
  };
  return (
    <div>
      <form onSubmit={crear} className="d-flex gap-2 mb-2" style={{ maxWidth: 420 }}>
        <input className="form-control form-control-sm" placeholder="Nueva marca" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
      </form>
      <SimpleTable
        columns={["ID", "Nombre", "Activo"]}
        rows={items.map((m) => (
          <tr key={m.id}><td>{m.id}</td><td>{m.nombre}</td><td>{m.activo ? "SÃ­" : "No"}</td></tr>
        ))}
      />
    </div>
  );
}

function TabModelos() {
  const [marcas, setMarcas] = useState([]);
  const [items, setItems] = useState([]);
  const [marcaId, setMarcaId] = useState("");
  const [nombre, setNombre] = useState("");
  const loadMarcas = () => api.get("/catalogo/marcas?size=500").then(({ data }) => setMarcas(data.items));
  const loadModelos = (mid) => {
    if (!mid) return setItems([]);
    api.get(`/catalogo/modelos?marca_id=${mid}`).then(({ data }) => setItems(data));
  };
  useEffect(loadMarcas, []);
  const crear = async (e) => {
    e.preventDefault();
    if (!marcaId || !nombre.trim()) return;
    await api.post("/catalogo/modelos", { marca_id: Number(marcaId), nombre });
    setNombre("");
    loadModelos(marcaId);
  };
  return (
    <div>
      <form onSubmit={crear} className="d-flex gap-2 mb-2" style={{ maxWidth: 520 }}>
        <select className="form-select form-select-sm" value={marcaId} onChange={(e) => { setMarcaId(e.target.value); loadModelos(e.target.value); }}>
          <option value="">Marca</option>
          {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <input className="form-control form-control-sm" placeholder="Nuevo modelo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
      </form>
      <SimpleTable
        columns={["ID", "Marca", "Nombre"]}
        rows={items.map((m) => (
          <tr key={m.id}><td>{m.id}</td><td>{m.marca?.nombre || ""}</td><td>{m.nombre}</td></tr>
        ))}
      />
    </div>
  );
}

function TabProveedores() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nombre: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "" });
  const load = () => api.get("/catalogo/proveedores?size=500").then(({ data }) => setItems(data.items));
  useEffect(load, []);
  const crear = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    await api.post("/catalogo/proveedores", { ...form, nit: form.nit || null, contacto: form.contacto || null, telefono: form.telefono || null, correo: form.correo || null, direccion: form.direccion || null });
    setForm({ nombre: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "" });
    load();
  };
  return (
    <div>
      <form onSubmit={crear} className="row g-2 mb-2">
        <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="NIT" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Contacto" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="TelÃ©fono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
        <div className="col-md-1"><button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button></div>
      </form>
      <SimpleTable
        columns={["ID", "Nombre", "NIT", "Contacto", "Email"]}
        rows={items.map((p) => (
          <tr key={p.id}><td>{p.id}</td><td>{p.nombre}</td><td>{p.nit || "â€”"}</td><td>{p.contacto || "â€”"}</td><td>{p.correo || "â€”"}</td></tr>
        ))}
      />
    </div>
  );
}

function TabEstados() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ codigo: "", nombre: "", color: "#6c757d" });
  const load = () => api.get("/catalogo/estados").then(({ data }) => setItems(data));
  useEffect(load, []);
  const crear = async (e) => {
    e.preventDefault();
    await api.post("/catalogo/estados", form);
    setForm({ codigo: "", nombre: "", color: "#6c757d" });
    load();
  };
  return (
    <div>
      <form onSubmit={crear} className="d-flex gap-2 mb-2" style={{ maxWidth: 560 }}>
        <input className="form-control form-control-sm" placeholder="CÃ³digo (EN_PRESTAMO)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        <input className="form-control form-control-sm" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input type="color" className="form-control form-control-color w-auto" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear</button>
      </form>
      <SimpleTable
        columns={["CÃ³digo", "Nombre", "Color"]}
        rows={items.map((e) => (
          <tr key={e.id}><td>{e.codigo}</td><td>{e.nombre}</td><td><span className="d-inline-block rounded" style={{ width: 18, height: 18, background: e.color }}></span> {e.color}</td></tr>
        ))}
      />
    </div>
  );
}

export default function Catalogos() {
  const { can } = useAuth();
  const [tab, setTab] = useState("categorias");
  const tabs = [
    ["categorias", "CategorÃ­as"],
    ["marcas", "Marcas"],
    ["modelos", "Modelos"],
    ["proveedores", "Proveedores"],
    ["estados", "Estados"],
  ];
  return (
    <div>
      <h5 className="mb-3">CatÃ¡logos</h5>
      {!can("gestionar_catalogos") ? (
        <div className="alert alert-warning">No tienes permisos para gestionar catÃ¡logos.</div>
      ) : (
        <div className="card stat-card">
          <div className="card-header bg-white">
            <ul className="nav nav-tabs card-header-tabs">
              {tabs.map(([k, l]) => (
                <li className="nav-item" key={k}>
                  <button className={`nav-link ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-body">
            {tab === "categorias" && <TabCategorias />}
            {tab === "marcas" && <TabMarcas />}
            {tab === "modelos" && <TabModelos />}
            {tab === "proveedores" && <TabProveedores />}
            {tab === "estados" && <TabEstados />}
          </div>
        </div>
      )}
    </div>
  );
}