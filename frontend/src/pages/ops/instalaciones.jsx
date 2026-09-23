import { useState } from "react";
import api from "../../api/client";
import { Card, EmptyState, LoadingBlock, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../context/ToastContext";
import { fmtDate } from "../../utils/format";

const ESTADOS = ["PROGRAMADA", "EN_PROCESO", "COMPLETADA", "CANCELADA"];
const TIPOS = ["INSTALACION", "REUBICACION", "SOPORTE_SITIO", "RETIRO"];

const badge = {
  PROGRAMADA: { c: "#0b66c2", bg: "#0b66c217" },
  EN_PROCESO: { c: "#fd7e14", bg: "#fd7e141c" },
  COMPLETADA: { c: "#28a745", bg: "#28a7451c" },
  CANCELADA: { c: "#6c757d", bg: "#6c757d1c" },
};

export default function Instalaciones() {
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState("");
  const [tick, setTick] = useState(0);
  const [modal, setModal] = useState(null); // {item|null, estado|null}
  const [cambioEstado, setCambioEstado] = useState(null);

  const load = () => setTick((t) => t + 1);

  const res = useAsync(async () => {
    const q = new URLSearchParams({ page, size: 30 });
    if (estado) q.set("estado", estado);
    const r = await api.get(`/instalaciones?${q}`);
    return r.data;
  }, [page, estado, tick]);
  const d = res.data || {};
  const rows = d.items || [];

  const change = async (it, nuevo) => {
    setCambioEstado(it.id);
    try {
      await api.put(`/instalaciones/${it.id}`, { estado: nuevo });
      pushToast("success", `Instalación ${it.numero} → ${nuevo}`);
      load();
    } catch (e) { pushToast("error", e.message); }
    finally { setCambioEstado(null); }
  };

  return (
    <div>
      <PageHeader title="Instalaciones" subtitle="Programación y ejecución de servicios en sitio" icon="tools"
        actions={<button className="btn btn-sm btn-brand" onClick={() => setModal({ item: null })}><i className="bi bi-plus-lg me-1" /> Nueva instalación</button>} />

      <div className="d-flex gap-2 flex-wrap mb-3 align-items-center">
        <select className="form-select form-select-sm w-auto" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {res.loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="tools" title="Sin instalaciones" hint="Registra la primera programación de servicio" /></Card>
      ) : (
        <Card>
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>#</th><th>Servicio</th><th>Fecha progr.</th><th>Detalle</th><th>Técnico</th><th>Ubicación</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.id}>
                    <td><span className="fw-semibold">{it.numero}</span></td>
                    <td><span className="badge eta-badge" style={{ background: "#0b66c217", color: "#0b66c2" }}>{it.tipo_servicio?.replace("_", " ")}</span></td>
                    <td className="small">{it.fecha_programada ? fmtDate(it.fecha_programada) : "—"}</td>
                    <td className="small text-secondary" style={{ maxWidth: 260 }}>{it.descripcion || "—"}</td>
                    <td className="small">{it.tecnico || "—"}</td>
                    <td className="small">{it.ubicacion?.nombre || "—"}</td>
                    <td>
                      {cambioEstado === it.id ? (
                        <span className="spinner-border spinner-border-sm text-primary" />
                      ) : (
                        <span className="badge eta-badge" style={{ background: badge[it.estado]?.bg, color: badge[it.estado]?.c }}>{it.estado?.replace("_", " ") || it.estado}</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="dropdown">
                        <button className="btn btn-sm btn-light" data-bs-toggle="dropdown"><i className="bi bi-three-dots"></i></button>
                        <ul className="dropdown-menu dropdown-menu-end shadow">
                          <li><button className="dropdown-item" onClick={() => setModal({ item: it })}><i className="bi bi-pencil me-2 text-primary"></i>Editar</button></li>
                          {ESTADOS.filter((s) => s !== it.estado).map((s) => (
                            <li key={s}><button className="dropdown-item" onClick={() => change(it, s)}><i className="bi bi-arrow-repeat me-2 text-secondary"></i>Marcar {s.replace("_", " ")}</button></li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center pt-3 px-3">
              <small className="text-secondary">Página {d.page} de {d.pages}</small>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-light" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left"></i></button>
                <button className="btn btn-sm btn-light" disabled={page >= d.pages} onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right"></i></button>
              </div>
            </div>
          )}
        </Card>
      )}

      <InstalacionModal key={modal ? `inst-${modal.item?.id ?? "nuevo"}` : "cerrado"} item={modal?.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} pushToast={pushToast} />
    </div>
  );
}

function InstalacionModal({ item, onClose, onSaved, pushToast }) {
  const esEdit = !!item;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  if (!form && item !== undefined) {
    setTimeout(() => setForm({
      tipo_servicio: item?.tipo_servicio || "INSTALACION",
      descripcion: item?.descripcion || "",
      tecnico: item?.tecnico || "",
      cliente: item?.cliente || "",
      ubicacion_id: item?.ubicacion_id ?? "",
      activo_id: item?.activo_id ?? "",
      fecha_programada: item?.fecha_programada ? item.fecha_programada.slice(0, 10) : new Date().toISOString().slice(0, 10),
      estado: item?.estado || "PROGRAMADA",
    }), 0);
    return null;
  }
  if (item === undefined) return null;

  const guardar = async () => {
    setBusy(true);
    try {
      const body = {
        tipo_servicio: form.tipo_servicio,
        descripcion: form.descripcion,
        tecnico: form.tecnico,
        cliente: form.cliente,
        ubicacion_id: form.ubicacion_id ? Number(form.ubicacion_id) : null,
        activo_id: form.activo_id ? Number(form.activo_id) : null,
        fecha_programada: form.fecha_programada,
        estado: form.estado,
      };
      if (esEdit) await api.put(`/instalaciones/${item.id}`, body);
      else await api.post("/instalaciones", body);
      pushToast("success", esEdit ? "Instalación actualizada" : "Instalación programada");
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  };

  return (
    <Modal open title={esEdit ? `Editar ${item.numero}` : "Nueva instalación"} icon="tools" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>{busy ? "Guardando…" : "Guardar"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Tipo de servicio *</label>
          <select className="form-select" value={form.tipo_servicio} onChange={(e) => setForm({ ...form, tipo_servicio: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Fecha programada *</label>
          <input type="date" className="form-control" value={form.fecha_programada} onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })} />
        </div>
        <div className="col-12">
          <label className="form-label small fw-semibold">Descripción *</label>
          <textarea className="form-control" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Qué se va a instalar, reubicar o atender" />
        </div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Técnico</label><input className="form-control" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Cliente / responsable</label><input className="form-control" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Ubicación</label>
          <UbicacionesSelect value={form.ubicacion_id} onChange={(v) => setForm({ ...form, ubicacion_id: v })} />
        </div>
        {esEdit && (
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Estado</label>
            <select className="form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}

function UbicacionesSelect({ value, onChange }) {
  const res = useAsync(() => api.get("/geo/ubicaciones"), []);
  const ubs = res.data || [];
  return (
    <select className="form-select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sin ubicación</option>
      {ubs.map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.sede?.nombre || ""}</option>)}
    </select>
  );
}