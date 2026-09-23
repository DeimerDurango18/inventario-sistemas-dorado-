import { useMemo, useState } from "react";
import api from "../../api/client";
import { Card, EmptyState, LoadingBlock, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../context/ToastContext";
import { fmtDate } from "../../utils/format";

export default function Usuarios() {
  const { pushToast } = useToast();
  const [tab, setTab] = useState("usuarios");
  const [tick, setTick] = useState(0);
  const [editando, setEditando] = useState(null);

  const load = () => setTick((t) => t + 1);

  const all = useAsync(async () => {
    const [usuarios, roles, permisos] = await Promise.all([
      api.get("/usuarios?size=100"),
      api.get("/usuarios/roles"),
      api.get("/usuarios/permisos"),
    ]);
    return {
      usuarios: usuarios.data?.items || usuarios.data || [],
      roles: roles.data || [],
      permisos: permisos.data || [],
    };
  }, [tick]);

  const d = all.data || {};
  const loading = all.loading;

  return (
    <div>
      <PageHeader title="Usuarios y roles" subtitle="Acceso al sistema y permisos" icon="people" />

      <div className="d-flex gap-1 flex-wrap mb-3">
        <button className={`btn btn-sm ${tab === "usuarios" ? "btn-brand" : "btn-light"}`} onClick={() => setTab("usuarios")}>
          <i className="bi bi-person me-1" /> Usuarios
        </button>
        <button className={`btn btn-sm ${tab === "roles" ? "btn-brand" : "btn-light"}`} onClick={() => setTab("roles")}>
          <i className="bi bi-shield-check me-1" /> Roles y permisos
        </button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : tab === "usuarios" ? (
        <Card title={`Usuarios (${d.usuarios.length})`} icon="person"
          actions={<button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "usuarios", item: null })}><i className="bi bi-person-plus me-1" /> Nuevo usuario</button>}>
          {d.usuarios.length === 0 ? <EmptyState icon="person" title="Sin usuarios" /> : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Roles</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {d.usuarios.map((u) => (
                    <tr key={u.id}>
                      <td><span className="fw-semibold">{u.username}</span></td>
                      <td>{u.nombre}</td>
                      <td className="small text-secondary">{u.correo || "—"}</td>
                      <td>{u.roles?.map((r) => <span key={r.id} className="badge eta-badge me-1" style={{ background: "#e9f2fc", color: "#0b66c2" }}>{r.nombre}</span>)}</td>
                      <td className="small text-secondary">{u.last_login ? fmtDate(u.last_login) : "Nunca"}</td>
                      <td>
                        <span className="badge eta-badge" style={{ background: u.activo ? "#28a7451c" : "#6c757d1c", color: u.activo ? "#28a745" : "#6c757d" }}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" onClick={() => setEditando({ tipo: "usuarios", item: u })}><i className="bi bi-pencil text-primary"></i></button>
                        {u.activo && (
                          <button className="btn btn-sm btn-light ms-1" title="Desactivar" onClick={async () => {
                            try {
                              await api.del(`/usuarios/${u.id}`);
                              pushToast("success", "Usuario desactivado");
                              load();
                            } catch (e) { pushToast("error", e.message); }
                          }}><i className="bi bi-x-circle text-danger"></i></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card title={`Roles (${d.roles.length})`} icon="shield-check"
          actions={<button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "roles", item: null })}><i className="bi bi-plus-lg me-1" /> Nuevo rol</button>}>
          {d.roles.length === 0 ? <EmptyState icon="shield" title="Sin roles" /> : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Código</th><th>Nombre</th><th>Permisos</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {d.roles.map((r) => (
                    <tr key={r.id}>
                      <td><code className="text-secondary">{r.codigo}</code></td>
                      <td className="fw-semibold">{r.nombre}</td>
                      <td className="small text-secondary">{r.permisos?.length || 0} permisos</td>
                      <td><span className="badge eta-badge" style={{ background: r.activo ? "#28a7451c" : "#6c757d1c", color: r.activo ? "#28a745" : "#6c757d" }}>{r.activo ? "Activo" : "Inactivo"}</span></td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" onClick={() => setEditando({ tipo: "roles", item: r })}><i className="bi bi-pencil text-primary"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <UsuariosModal
        key={editando ? `${editando.tipo}-${editando.item?.id ?? "nuevo"}` : "cerrado"}
        tipo={editando?.tipo}
        item={editando?.item}
        roles={d.roles}
        permisos={d.permisos}
        onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); load(); }}
        pushToast={pushToast}
      />
    </div>
  );
}

function UsuariosModal({ tipo, item, roles, permisos, onClose, onSaved, pushToast }) {
  const esEdit = !!item;
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(
    tipo === "usuarios"
      ? { username: item?.username || "", password: "", nombre: item?.nombre || "", correo: item?.correo || "", documento: item?.documento || "", telefono: item?.telefono || "", rol_ids: item?.roles?.map((r) => r.id) || [], activo: item?.activo ?? true }
      : { codigo: item?.codigo || "", nombre: item?.nombre || "", descripcion: item?.descripcion || "", permiso_ids: item?.permisos?.map((p) => p.id) || [], activo: item?.activo ?? true }
  );

  if (!tipo) return null;

  const isUser = tipo === "usuarios";
  const titulo = esEdit ? (isUser ? `Editar ${item.username}` : `Editar ${item.nombre}`) : isUser ? "Nuevo usuario" : "Nuevo rol";

  const togglePermiso = (id) =>
    setForm((f) => ({ ...f, permiso_ids: f.permiso_ids.includes(id) ? f.permiso_ids.filter((x) => x !== id) : [...f.permiso_ids, id] }));
  const toggleRol = (id) =>
    setForm((f) => ({ ...f, rol_ids: f.rol_ids.includes(id) ? f.rol_ids.filter((x) => x !== id) : [...f.rol_ids, id] }));

  const guardar = async () => {
    setBusy(true);
    try {
      if (isUser) {
        const body = { username: form.username, nombre: form.nombre, correo: form.correo, documento: form.documento, telefono: form.telefono, rol_ids: form.rol_ids };
        if (esEdit) {
          const upd = { nombre: body.nombre, correo: body.correo, documento: body.documento, telefono: body.telefono, rol_ids: body.rol_ids, activo: form.activo };
          if (form.password) upd.password = form.password;
          await api.put(`/usuarios/${item.id}`, upd);
        } else {
          await api.post("/usuarios", { ...body, password: form.password });
        }
        pushToast("success", esEdit ? "Usuario actualizado" : "Usuario creado");
      } else {
        if (esEdit) await api.put(`/usuarios/roles/${item.id}`, { nombre: form.nombre, descripcion: form.descripcion, activo: form.activo, permiso_ids: form.permiso_ids });
        else await api.post("/usuarios/roles", { codigo: form.codigo, nombre: form.nombre, descripcion: form.descripcion, permiso_ids: form.permiso_ids });
        pushToast("success", esEdit ? "Rol actualizado" : "Rol creado");
      }
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  };

  return (
    <Modal open={!!tipo} title={titulo} icon={esEdit ? "pencil" : "plus-circle"} onClose={onClose} busy={busy} size="lg"
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      {isUser ? (
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label small fw-semibold">Usuario *</label><input className="form-control" value={form.username} disabled={esEdit} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">{esEdit ? "Nueva contraseña" : "Contraseña *"}</label><input type="password" className="form-control" placeholder={esEdit ? "Dejar en blanco para no cambiar" : ""} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Nombre completo *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Correo</label><input className="form-control" value={form.correo || ""} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Documento</label><input className="form-control" value={form.documento || ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Teléfono</label><input className="form-control" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
          <div className="col-12">
            <label className="form-label small fw-semibold">Roles</label>
            <div className="d-flex flex-wrap gap-2">
              {roles.map((r) => (
                <button type="button" key={r.id}
                  className={`btn btn-sm ${form.rol_ids.includes(r.id) ? "btn-brand" : "btn-light"}`}
                  onClick={() => toggleRol(r.id)}>
                  {r.nombre}
                </button>
              ))}
            </div>
          </div>
          {esEdit && (
            <div className="col-12 d-flex align-items-center gap-2">
              <input type="checkbox" id="usrAct" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              <label htmlFor="usrAct" className="small">Usuario activo</label>
            </div>
          )}
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-md-4"><label className="form-label small fw-semibold">Código *</label><input className="form-control" value={form.codigo} disabled={esEdit} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
          <div className="col-md-8"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="col-12"><label className="form-label small fw-semibold">Descripción</label><input className="form-control" value={form.descripcion || ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
          <div className="col-12">
            <label className="form-label small fw-semibold">Permisos ({form.permiso_ids?.length})</label>
            <div className="row g-2">
              {permisos.map((p) => (
                <div className="col-md-6 col-xl-4" key={p.id}>
                  <button type="button"
                    className={`btn btn-sm w-100 text-start justify-content-between ${form.permiso_ids.includes(p.id) ? "btn-brand" : "btn-light"}`}
                    onClick={() => togglePermiso(p.id)}>
                    <span>{p.nombre}</span>
                    {form.permiso_ids.includes(p.id) && <i className="bi bi-check-lg ms-1"></i>}
                  </button>
                </div>
              ))}
            </div>
          </div>
          {esEdit && (
            <div className="col-12 d-flex align-items-center gap-2">
              <input type="checkbox" id="rolAct" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              <label htmlFor="rolAct" className="small">Rol activo</label>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}