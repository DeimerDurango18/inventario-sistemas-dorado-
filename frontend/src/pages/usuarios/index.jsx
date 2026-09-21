import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function Usuarios() {
  const { can } = useAuth();
  const [tab, setTab] = useState("usuarios");
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ username: "", nombre: "", correo: "", password: "", rol_ids: [] });
  const [roleForm, setRoleForm] = useState({ nombre: "", codigo: "", permiso_ids: [] });
  const [permisos, setPermisos] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    const [u, r, p] = await Promise.all([
      api.get("/usuarios?size=100").catch(() => ({ data: { items: [] } })),
      api.get("/usuarios/roles"),
      api.get("/usuarios/permisos"),
    ]);
    setItems(u.data.items);
    setRoles(r.data);
    setPermisos(p.data);
  };
  useEffect(load, []);

  if (!can("gestionar_usuarios")) {
    return <div className="alert alert-warning">No tienes permisos para gestionar usuarios.</div>;
  }

  const crearUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/usuarios", { ...form, correo: form.correo, rol_ids: form.rol_ids.map(Number) });
      setForm({ username: "", nombre: "", correo: "", password: "", rol_ids: [] });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const crearRol = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/usuarios/roles", { ...roleForm, permiso_ids: roleForm.permiso_ids.map(Number) });
      setRoleForm({ nombre: "", codigo: "", permiso_ids: [] });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h5 className="mb-3">Usuarios y roles</h5>
      <div className="card stat-card">
        <div className="card-header bg-white">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item"><button className={`nav-link ${tab === "usuarios" ? "active" : ""}`} onClick={() => setTab("usuarios")}>Usuarios</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")}>Roles y permisos</button></li>
          </ul>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {tab === "usuarios" && (
            <div>
              <form onSubmit={crearUser} className="row g-2 mb-3">
                <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Usuario *" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Nombre completo *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Correo" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
                <div className="col-md-2"><input type="password" className="form-control form-control-sm" placeholder="ContraseÃ±a *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                <div className="col-md-2">
                  <select multiple className="form-select form-select-sm" style={{ minHeight: 34 }} value={form.rol_ids} onChange={(e) => setForm({ ...form, rol_ids: [...e.target.selectedOptions].map((o) => o.value) })}>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }}>Crear usuario</button>
                </div>
              </form>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead className="table-light"><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Roles</th><th>Activo</th></tr></thead>
                  <tbody>
                    {items.length === 0 && <tr><td colSpan={5} className="text-center text-secondary py-3">Sin usuarios</td></tr>}
                    {items.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.nombre}</td>
                        <td>{u.correo || "â€”"}</td>
                        <td>{(u.roles || []).map((r) => r.nombre).join(", ") || "â€”"}</td>
                        <td>{u.activo ? "SÃ­" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "roles" && (
            <div className="row g-4">
              <div className="col-md-5">
                <h6 className="fw-semibold">Roles existentes</h6>
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light"><tr><th>Nombre</th><th>CÃ³digo</th><th>Permisos</th></tr></thead>
                    <tbody>
                      {roles.map((r) => (
                        <tr key={r.id}>
                          <td>{r.nombre}</td>
                          <td>{r.codigo}</td>
                          <td>{(r.permisos || []).map((p) => p.codigo).join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6">
                <h6 className="fw-semibold">Nuevo rol</h6>
                <form onSubmit={crearRol} className="d-flex flex-column gap-2">
                  <input className="form-control form-control-sm" placeholder="Nombre rol *" value={roleForm.nombre} onChange={(e) => setRoleForm({ ...roleForm, nombre: e.target.value })} required />
                  <input className="form-control form-control-sm" placeholder="CÃ³digo (ej. OPERADOR_SISTEMA)" value={roleForm.codigo} onChange={(e) => setRoleForm({ ...roleForm, codigo: e.target.value })} required />
                  <div className="border rounded p-2" style={{ maxHeight: 200, overflowY: "auto" }}>
                    {permisos.map((p) => (
                      <div key={p.id} className="form-check">
                        <input className="form-check-input" type="checkbox" id={`p${p.id}`} value={p.id}
                          checked={roleForm.permiso_ids.includes(String(p.id))}
                          onChange={(e) => setRoleForm({ ...roleForm, permiso_ids: e.target.checked ? [...roleForm.permiso_ids, String(p.id)] : roleForm.permiso_ids.filter((x) => x !== String(p.id)) })} />
                        <label className="form-check-label" htmlFor={`p${p.id}`}>{p.codigo} <small className="text-secondary">({p.nombre})</small></label>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-sm text-white align-self-start" style={{ background: "var(--eticos-primary)" }}>Crear rol</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}