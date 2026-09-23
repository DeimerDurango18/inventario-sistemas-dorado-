import { useState } from "react";
import api from "../../api/client";
import { Card, EmptyState, LoadingBlock, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../context/ToastContext";
import { fmtDateTime } from "../../utils/format";

const ESTADOS = ["ABIERTA", "EN_ATENCION", "RESUELTA"];
const badge = {
  ABIERTA: { c: "#fd7e14", bg: "#fd7e141c" },
  EN_ATENCION: { c: "#0b66c2", bg: "#0b66c217" },
  RESUELTA: { c: "#28a745", bg: "#28a7451c" },
};

export default function Atenciones() {
  const { pushToast } = useToast();
  const [estado, setEstado] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [modal, setModal] = useState(null);

  const res = useAsync(async () => {
    const q = new URLSearchParams({ size: 50 });
    if (estado) q.set("estado", estado);
    const r = await api.get(`/atenciones-punto?${q}`);
    return r.data;
  }, [estado, reloadTick]);
  const rows = res.data?.items || res.data || [];

  const cerrar = async (it, solucion) => {
    try {
      await api.put(`/atenciones-punto/${it.id}`, { estado: "RESUELTA", solucion });
      pushToast("success", "Atención marcada como resuelta");
      setModal(null);
      setReloadTick((t) => t + 1);
    } catch (e) { pushToast("error", e.message); }
  };

  return (
    <div>
      <PageHeader title="Atenciones de punto" subtitle="Soporte técnico en puntos de venta y sucursales" icon="headset"
        actions={<button className="btn btn-sm btn-brand" onClick={() => setModal({ item: null })}><i className="bi bi-plus-lg me-1" /> Nueva atención</button>} />

      <div className="d-flex gap-2 flex-wrap mb-3 align-items-center">
        <select className="form-select form-select-sm w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todas</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {res.loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="headset" title="Sin atenciones registradas" /></Card>
      ) : (
        <Card>
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>#</th><th>Punto</th><th>Contacto</th><th>Problema</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.id}>
                    <td><span className="fw-semibold">{it.numero}</span></td>
                    <td>{it.nombre_punto} {it.categoria && <span className="badge eta-badge ms-1" style={{ background: "#e9f2fc", color: "#0b66c2" }}>{it.categoria}</span>}</td>
                    <td className="small text-secondary">{it.contacto || "—"} {it.telefono && <div className="text-muted">{it.telefono}</div>}</td>
                    <td className="small text-secondary" style={{ maxWidth: 300 }}>{it.descripcion_problema || "—"}</td>
                    <td className="small">{fmtDateTime(it.fecha)}</td>
                    <td><span className="badge eta-badge" style={{ background: badge[it.estado]?.bg, color: badge[it.estado]?.c }}>{it.estado?.replace("_", " ") || it.estado}</span></td>
                    <td className="text-end">
                      {it.estado !== "RESUELTA" && (
                        <button className="btn btn-sm btn-outline-success" onClick={() => setModal({ item: it, resolver: true })}>
                          <i className="bi bi-check2-circle me-1" /> Resolver
                        </button>
                      )}
                      <button className="btn btn-sm btn-light ms-1" onClick={() => setModal({ item: it })}><i className="bi bi-pencil text-primary"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AtencionModal
        key={modal ? `${modal.item?.id ?? "nuevo"}-${modal.resolver ? "r" : "e"}` : "cerrado"}
        item={modal?.item}
        resolver={modal?.resolver}
        onClose={() => setModal(null)}
        onResuelta={cerrar}
        onSaved={() => { setModal(null); setReloadTick((t) => t + 1); }}
        pushToast={pushToast}
      />
    </div>
  );
}

function AtencionModal({ item, resolver, onClose, onResuelta, onSaved, pushToast }) {
  const esEdit = !!item;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  if (!form && item !== undefined) {
    setTimeout(() => setForm({
      nombre_punto: item?.nombre_punto || "",
      categoria: item?.categoria || "",
      contacto: item?.contacto || "",
      telefono: item?.telefono || "",
      descripcion_problema: item?.descripcion_problema || "",
      solucion: item?.solucion || "",
      estado: item?.estado || "ABIERTA",
    }), 0);
    return null;
  }
  if (item === undefined) return null;

  const guardar = async () => {
    setBusy(true);
    try {
      if (resolver) {
        if (!form.solucion.trim()) { pushToast("error", "Indica la solución aplicada"); setBusy(false); return; }
        await onResuelta(item, form.solucion);
      } else if (esEdit) {
        const body = {
          nombre_punto: form.nombre_punto,
          categoria: form.categoria,
          contacto: form.contacto,
          telefono: form.telefono,
          descripcion_problema: form.descripcion_problema,
          estado: form.estado,
        };
        if (form.solucion) body.solucion = form.solucion;
        await api.put(`/atenciones-punto/${item.id}`, body);
        pushToast("success", "Atención actualizada");
        setBusy(false);
        onSaved();
      } else {
        await api.post("/atenciones-punto", {
          nombre_punto: form.nombre_punto,
          categoria: form.categoria,
          contacto: form.contacto,
          telefono: form.telefono,
          descripcion_problema: form.descripcion_problema,
        });
        pushToast("success", "Atención creada");
        setBusy(false);
        onSaved();
      }
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title={resolver ? "Resolver atención" : esEdit ? `Editar ${item.numero}` : "Nueva atención"} icon={resolver ? "check2-circle" : "headset"} onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className={`btn btn-sm ${resolver ? "btn-success" : "btn-brand"}`} disabled={busy} onClick={guardar}>
            {busy ? "Guardando…" : resolver ? "Marcar resuelta" : "Guardar"}
          </button>
        </>
      }>
      <div className="row g-3">
        <div className="col-md-7"><label className="form-label small fw-semibold">Punto *</label><input className="form-control" disabled={resolver} value={form.nombre_punto} onChange={(e) => setForm({ ...form, nombre_punto: e.target.value })} placeholder="Ej: Punto de venta Centro" /></div>
        <div className="col-md-5"><label className="form-label small fw-semibold">Categoría</label><input className="form-control" disabled={resolver} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Venta / Distribución" /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Contacto</label><input className="form-control" disabled={resolver} value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Teléfono</label><input className="form-control" disabled={resolver} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="col-12">
          <label className="form-label small fw-semibold">{resolver ? "Descripción del problema" : "Problema / requerimiento *"}</label>
          <textarea className="form-control" rows={2} disabled={resolver} value={form.descripcion_problema} onChange={(e) => setForm({ ...form, descripcion_problema: e.target.value })} />
        </div>
        {esEdit && (
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Estado</label>
            <select className="form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        )}
        <div className="col-12">
          <label className="form-label small fw-semibold">{resolver || esEdit ? "Solución" : ""}{resolver ? " *" : ""}</label>
          {resolver || esEdit ? (
            <textarea className="form-control" rows={2} value={form.solucion} onChange={(e) => setForm({ ...form, solucion: e.target.value })} placeholder="Actividades realizadas y resultado" />
          ) : null}
        </div>
      </div>
    </Modal>
  );
}