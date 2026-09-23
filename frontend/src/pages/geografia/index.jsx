import { useMemo, useState } from "react";
import api from "../../api/client";
import { Card, EmptyState, LoadingBlock, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../context/ToastContext";

export default function Geografia() {
  const { pushToast } = useToast();
  const [tab, setTab] = useState("sedes");
  const [tick, setTick] = useState(0);
  const [editando, setEditando] = useState(null);
  const [filtroPais, setFiltroPais] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");

  const load = () => setTick((t) => t + 1);

  const all = useAsync(async () => {
    const [sedes, ubicaciones, tipos, paises, departamentos, ciudades] = await Promise.all([
      api.get("/geo/sedes"),
      api.get("/geo/ubicaciones"),
      api.get("/geo/tipos-ubicacion"),
      api.get("/geo/paises"),
      api.get("/geo/departamentos"),
      api.get("/geo/ciudades?limit=5000"),
    ]);
    return {
      sedes: sedes.data || [],
      ubicaciones: ubicaciones.data || [],
      tipos: tipos.data || [],
      paises: paises.data || [],
      departamentos: departamentos.data || [],
      ciudades: ciudades.data || [],
    };
  }, [tick]);

  const d = { sedes: [], ubicaciones: [], tipos: [], paises: [], departamentos: [], ciudades: [], ...(all.data || {}) };
  const loading = all.loading;

  const tabs = [
    { key: "sedes", label: "Sedes", icon: "building" },
    { key: "ubicaciones", label: "Ubicaciones", icon: "geo-alt" },
    { key: "tipos", label: "Tipos de ubicación", icon: "diagram-3" },
    { key: "geografia", label: "Geografía", icon: "globe2" },
  ];

  const deptosFiltrados = filtroPais
    ? d.departamentos.filter((x) => x.pais_id === Number(filtroPais))
    : d.departamentos;
  const ciudadesFiltradas = filtroDepto
    ? d.ciudades.filter((c) => c.departamento_id === Number(filtroDepto))
    : d.ciudades.filter((c) => deptosFiltrados.some((x) => x.id === c.departamento_id));

  return (
    <div>
      <PageHeader title="Sedes y ubicaciones" subtitle="Geografía operativa del inventario" icon="geo-alt" />

      <div className="d-flex gap-1 flex-wrap mb-3">
        {tabs.map((t) => (
          <button key={t.key} className={`btn btn-sm ${tab === t.key ? "btn-brand" : "btn-light"}`} onClick={() => setTab(t.key)}>
            <i className={`bi bi-${t.icon} me-1`}></i> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : tab === "sedes" ? (
        <Card title={`Sedes (${d.sedes.length})`} icon="building"
          actions={<button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "sedes", item: null })}><i className="bi bi-plus-lg me-1" /> Nueva sede</button>}>
          {d.sedes.length === 0 ? <EmptyState icon="building" title="Sin sedes" hint="Crea primero un país, departamento y ciudad en la pestaña Geografía" /> : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Código</th><th>Nombre</th><th>Ciudad</th><th>Dirección</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {d.sedes.map((s) => (
                    <tr key={s.id}>
                      <td><span className="fw-semibold">{s.codigo}</span></td>
                      <td>{s.nombre}</td>
                      <td className="small">{s.ciudad?.nombre || "—"}</td>
                      <td className="small text-secondary">{s.direccion || "—"}</td>
                      <td className="small">{s.telefono || "—"}</td>
                      <td><span className="badge eta-badge" style={{ background: "#17b26a1c", color: "#17b26a" }}>{s.estado || "Activa"}</span></td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" onClick={() => setEditando({ tipo: "sedes", item: s })}><i className="bi bi-pencil text-primary"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : tab === "ubicaciones" ? (
        <Card title={`Ubicaciones (${d.ubicaciones.length})`} icon="geo-alt"
          actions={<button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "ubicaciones", item: null })}><i className="bi bi-plus-lg me-1" /> Nueva ubicación</button>}>
          {d.ubicaciones.length === 0 ? <EmptyState icon="geo-alt" title="Sin ubicaciones" /> : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Nombre</th><th>Sede</th><th>Tipo</th><th>Activa</th><th></th></tr></thead>
                <tbody>
                  {d.ubicaciones.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold">{u.nombre}</td>
                      <td className="small">{u.sede?.nombre || "—"}</td>
                      <td className="small">{u.tipo_ubicacion?.nombre || "—"}</td>
                      <td>
                        <span className={`badge eta-badge ${u.es_activa ? "" : ""}`} style={{ background: u.es_activa ? "#17b26a1c" : "#64748b1c", color: u.es_activa ? "#17b26a" : "#64748b" }}>
                          {u.es_activa ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" onClick={() => setEditando({ tipo: "ubicaciones", item: u })}><i className="bi bi-pencil text-primary"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : tab === "tipos" ? (
        <Card title={`Tipos de ubicación (${d.tipos.length})`} icon="diagram-3"
          actions={<button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "tipos", item: null })}><i className="bi bi-plus-lg me-1" /> Nuevo tipo</button>}>
          {d.tipos.length === 0 ? <EmptyState icon="diagram-3" title="Sin tipos" /> : (
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Código</th><th>Nombre</th><th>Estado</th></tr></thead>
                <tbody>
                  {d.tipos.map((t) => (
                    <tr key={t.id}>
                      <td><span className="fw-semibold">{t.codigo}</span></td>
                      <td>{t.nombre}</td>
                      <td><span className="badge eta-badge" style={{ background: t.activo ? "#17b26a1c" : "#64748b1c", color: t.activo ? "#17b26a" : "#64748b" }}>{t.activo ? "Activo" : "Inactivo"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="d-flex flex-column gap-3">
          <Card title={`Países (${d.paises.length})`} icon="globe2"
            actions={<button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "paises", item: null })}><i className="bi bi-plus-lg me-1" /> Nuevo país</button>}>
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>#</th><th>País</th><th>Departamentos</th><th></th></tr></thead>
                <tbody>
                  {d.paises.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState icon="globe2" title="Sin países" hint="Agrega un país para poder registrar departamentos y ciudades" /></td></tr>
                  ) : d.paises.map((p, i) => (
                    <tr key={p.id}>
                      <td className="text-secondary small">{i + 1}</td>
                      <td className="fw-semibold">{p.nombre}</td>
                      <td className="small">{d.departamentos.filter((x) => x.pais_id === p.id).length}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" title="Agregar departamento" onClick={() => setEditando({ tipo: "departamentos", item: { pais_id: p.id, nombre: "" } })}>
                          <i className="bi bi-plus-lg text-primary"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={`Departamentos (${deptosFiltrados.length})`} icon="map"
            actions={
              <div className="d-flex gap-2 align-items-center">
                <select className="form-select form-select-sm w-auto" value={filtroPais} onChange={(e) => { setFiltroPais(e.target.value); setFiltroDepto(""); }}>
                  <option value="">Todos los países</option>
                  {d.paises.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "departamentos", item: null })}><i className="bi bi-plus-lg me-1" /> Nuevo departamento</button>
              </div>
            }>
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>País</th><th>Departamento</th><th>Ciudades</th><th></th></tr></thead>
                <tbody>
                  {deptosFiltrados.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState icon="map" title="Sin departamentos" /></td></tr>
                  ) : deptosFiltrados.map((x) => (
                    <tr key={x.id}>
                      <td className="small text-secondary">{d.paises.find((p) => p.id === x.pais_id)?.nombre || "—"}</td>
                      <td className="fw-semibold">{x.nombre}</td>
                      <td className="small">{d.ciudades.filter((c) => c.departamento_id === x.id).length}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-light" title="Agregar ciudad" onClick={() => setEditando({ tipo: "ciudades", item: { pais_id: x.pais_id, departamento_id: x.id, nombre: "" } })}>
                          <i className="bi bi-plus-lg text-primary"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={`Ciudades (${ciudadesFiltradas.length})`} icon="building-fill"
            actions={
              <div className="d-flex gap-2 align-items-center">
                <select className="form-select form-select-sm w-auto" value={filtroPais} onChange={(e) => { setFiltroPais(e.target.value); setFiltroDepto(""); }}>
                  <option value="">Todos los países</option>
                  {d.paises.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <select className="form-select form-select-sm w-auto" value={filtroDepto} onChange={(e) => setFiltroDepto(e.target.value)} disabled={!filtroPais}>
                  <option value="">Todos los departamentos</option>
                  {deptosFiltrados.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                </select>
                <button className="btn btn-sm btn-brand" onClick={() => setEditando({ tipo: "ciudades", item: null })}><i className="bi bi-plus-lg me-1" /> Nueva ciudad</button>
              </div>
            }>
            <div className="eticos-table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Departamento</th><th>Ciudad</th></tr></thead>
                <tbody>
                  {ciudadesFiltradas.length === 0 ? (
                    <tr><td colSpan={2}><EmptyState icon="building" title="Sin ciudades" /></td></tr>
                  ) : ciudadesFiltradas.map((c) => (
                    <tr key={c.id}>
                      <td className="small text-secondary">{d.departamentos.find((x) => x.id === c.departamento_id)?.nombre || "—"}</td>
                      <td className="fw-semibold">{c.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <GeoModal
        key={editando ? `${editando.tipo}-${editando.item?.id ?? "nuevo"}` : "cerrado"}
        tipo={editando?.tipo}
        item={editando?.item}
        sedes={d.sedes}
        tipos={d.tipos}
        paises={d.paises}
        ciudades={d.ciudades}
        onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); load(); }}
        pushToast={pushToast}
      />
    </div>
  );
}

function GeoModal({ tipo, item, sedes, tipos, paises, ciudades, onClose, onSaved, pushToast }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paisId, setPaisId] = useState(item?.pais_id ? String(item.pais_id) : "");
  const [deptoId, setDeptoId] = useState(item?.departamento_id ? String(item.departamento_id) : "");
  const [deptos, setDeptos] = useState([]);
  const [subCiudades, setSubCiudades] = useState([]);
  const esEdit = !!item;

  const loadSub = async (pid, did) => {
    if (pid) {
      const r = await api.get(`/geo/departamentos?pais_id=${pid}`).catch(() => ({ data: [] }));
      setDeptos(r.data || []);
    }
    if (did) {
      const r = await api.get(`/geo/ciudades?departamento_id=${did}&limit=2000`).catch(() => ({ data: [] }));
      setSubCiudades(r.data || []);
    }
  };

  const inicial = (t) => {
    if (t === "sedes") return { codigo: item?.codigo || "", nombre: item?.nombre || "", ciudad_id: item?.ciudad_id ?? "", tipo_ubicacion_id: item?.tipo_ubicacion_id ?? "", direccion: item?.direccion || "", telefono: item?.telefono || "", responsable: item?.responsable || "", observaciones: item?.observaciones || "" };
    if (t === "ubicaciones") return { nombre: item?.nombre || "", sede_id: item?.sede_id ?? "", tipo_ubicacion_id: item?.tipo_ubicacion_id ?? "", es_activa: item?.es_activa ?? true, observaciones: item?.observaciones || "" };
    if (t === "paises") return { nombre: item?.nombre || "" };
    if (t === "departamentos") return { nombre: item?.nombre || "", pais_id: item?.pais_id ?? "" };
    if (t === "ciudades") return { nombre: item?.nombre || "", departamento_id: item?.departamento_id ?? "" };
    return { codigo: item?.codigo || "", nombre: item?.nombre || "" };
  };

  if (!tipo) return null;
  if (!form) {
    setTimeout(() => setForm(inicial(tipo)), 0);
    return null;
  }

  const texto = (t) => ({ sedes: "sede", ubicaciones: "ubicación", tipos: "tipo de ubicación", paises: "país", departamentos: "departamento", ciudades: "ciudad" }[t]);
  const titulo = (esEdit ? "Editar " : "Nueva ") + texto(tipo);

  const guardar = async () => {
    setBusy(true);
    try {
      let body;
      if (tipo === "sedes") {
        body = { codigo: form.codigo, nombre: form.nombre, ciudad_id: form.ciudad_id ? Number(form.ciudad_id) : null, tipo_ubicacion_id: form.tipo_ubicacion_id ? Number(form.tipo_ubicacion_id) : null, direccion: form.direccion, telefono: form.telefono, responsable: form.responsable, observaciones: form.observaciones };
        if (esEdit) await api.put(`/geo/sedes/${item.id}`, body);
        else await api.post("/geo/sedes", body);
      } else if (tipo === "ubicaciones") {
        body = { nombre: form.nombre, sede_id: form.sede_id ? Number(form.sede_id) : null, tipo_ubicacion_id: form.tipo_ubicacion_id ? Number(form.tipo_ubicacion_id) : null, es_activa: form.es_activa, observaciones: form.observaciones };
        if (esEdit) await api.put(`/geo/ubicaciones/${item.id}`, body);
        else await api.post("/geo/ubicaciones", body);
      } else if (tipo === "tipos") {
        body = { codigo: form.codigo, nombre: form.nombre };
        await api.post("/geo/tipos-ubicacion", body);
      } else if (tipo === "paises") {
        body = { nombre: form.nombre };
        await api.post("/geo/paises", body);
      } else if (tipo === "departamentos") {
        body = { nombre: form.nombre, pais_id: form.pais_id ? Number(form.pais_id) : null };
        await api.post("/geo/departamentos", body);
      } else {
        body = { nombre: form.nombre, departamento_id: form.departamento_id ? Number(form.departamento_id) : null };
        await api.post("/geo/ciudades", body);
      }
      pushToast("success", esEdit ? "Actualizado" : "Creado");
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  };

  return (
    <Modal open={!!tipo} title={titulo} icon={esEdit ? "pencil" : "plus-circle"} onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      {tipo === "sedes" ? (
        <div className="row g-3">
          <div className="col-md-4"><label className="form-label small fw-semibold">Código *</label><input className="form-control" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
          <div className="col-md-8"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Ciudad *</label>
            <select className="form-select" value={paisId || ""} onChange={async (e) => {
              setPaisId(e.target.value);
              setDeptoId("");
              form.ciudad_id = "";
              await loadSub(e.target.value, "");
            }}>
              <option value="">País</option>
              {paises.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select className="form-select mt-2" value={deptoId || ""} onChange={async (e) => {
              setDeptoId(e.target.value);
              form.ciudad_id = "";
              await loadSub(paisId, e.target.value);
            }}>
              <option value="">Departamento</option>
              {deptos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
            <select className="form-select mt-2" value={form.ciudad_id || ""} onChange={(e) => setForm({ ...form, ciudad_id: e.target.value })}>
              <option value="">Ciudad</option>
              {subCiudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Tipo de ubicación</label>
            <select className="form-select" value={form.tipo_ubicacion_id || ""} onChange={(e) => setForm({ ...form, tipo_ubicacion_id: e.target.value })}>
              <option value="">Seleccionar…</option>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <label className="form-label small fw-semibold mt-2">Teléfono</label>
            <input className="form-control" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Dirección</label><input className="form-control" value={form.direccion || ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Responsable</label><input className="form-control" value={form.responsable || ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
          <div className="col-12"><label className="form-label small fw-semibold">Observaciones</label><textarea className="form-control" rows={2} value={form.observaciones || ""} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
        </div>
      ) : tipo === "ubicaciones" ? (
        <div className="row g-3">
          <div className="col-md-7"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="col-md-5">
            <label className="form-label small fw-semibold">Sede</label>
            <select className="form-select" value={form.sede_id || ""} onChange={(e) => setForm({ ...form, sede_id: e.target.value })}>
              <option value="">Seleccionar…</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Tipo de ubicación</label>
            <select className="form-select" value={form.tipo_ubicacion_id || ""} onChange={(e) => setForm({ ...form, tipo_ubicacion_id: e.target.value })}>
              <option value="">Seleccionar…</option>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end pb-1">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="ubAct" checked={!!form.es_activa} onChange={(e) => setForm({ ...form, es_activa: e.target.checked })} />
              <label className="form-check-label small" htmlFor="ubAct">Ubicación activa</label>
            </div>
          </div>
          <div className="col-12"><label className="form-label small fw-semibold">Observaciones</label><input className="form-control" value={form.observaciones || ""} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
        </div>
      ) : tipo === "paises" ? (
        <div className="row g-3">
          <div className="col-12"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Colombia" /></div>
        </div>
      ) : tipo === "departamentos" ? (
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold">País *</label>
            <select className="form-select" value={form.pais_id ? String(form.pais_id) : paisId || ""} onChange={(e) => setForm({ ...form, pais_id: e.target.value })}>
              <option value="">Seleccionar…</option>
              {paises.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Santander" /></div>
        </div>
      ) : tipo === "ciudades" ? (
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold">País *</label>
            <select className="form-select" value={paisId || ""} onChange={async (e) => {
              setPaisId(e.target.value);
              setDeptoId("");
              form.departamento_id = "";
              await loadSub(e.target.value, "");
            }}>
              <option value="">Seleccionar…</option>
              {paises.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Departamento *</label>
            <select className="form-select" value={form.departamento_id ? String(form.departamento_id) : deptoId || ""} onChange={(e) => setForm({ ...form, departamento_id: e.target.value })}>
              <option value="">Seleccionar…</option>
              {deptos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </div>
          <div className="col-12"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Bucaramanga" /></div>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-md-5"><label className="form-label small fw-semibold">Código *</label><input className="form-control" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="OFICINA" /></div>
          <div className="col-md-7"><label className="form-label small fw-semibold">Nombre *</label><input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
        </div>
      )}
    </Modal>
  );
}