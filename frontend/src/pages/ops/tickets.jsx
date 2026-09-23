import { useMemo, useState } from "react";
import api from "../../api/client";
import { Badge, Card, EmptyState, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDateTime } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

const PRIORIDAD = { BAJA: "success", MEDIA: "info", ALTA: "warning", URGENTE: "danger" };

export default function Tickets() {
  const { can } = useAuth();
  const { pushToast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [creando, setCreando] = useState(false);
  const [atendiendo, setAtendiendo] = useState(null);
  const [form, setForm] = useState({ sede_id: "", solicitante: "", categoria: "", prioridad: "MEDIA", descripcion: "" });
  const [solucion, setSolucion] = useState("");
  const [busy, setBusy] = useState(false);

  const loader = useMemo(
    () => api.get(`/tickets?page=${page}&size=20${filtro ? `&estado=${filtro}` : ""}`),
    [page, filtro]
  );
  const sedesApi = useAsync(() => api.get("/geo/sedes"), []);
  const { data, loading, reload } = useAsync(() => loader, [page, filtro]);
  const items = data?.items || [];
  const pages = data?.pages || 1;
  const sedes = sedesApi.data || [];

  const crear = async () => {
    if (!form.descripcion.trim()) return pushToast("warning", "Describe el problema a reportar");
    setBusy(true);
    try {
      await api.post("/tickets", {
        sede_id: form.sede_id ? Number(form.sede_id) : null,
        solicitante: form.solicitante || undefined,
        categoria: form.categoria || undefined,
        prioridad: form.prioridad,
        descripcion: form.descripcion,
      });
      pushToast("success", "Ticket creado");
      setCreando(false);
      setForm({ sede_id: "", solicitante: "", categoria: "", prioridad: "MEDIA", descripcion: "" });
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const resolver = async () => {
    if (!solucion.trim()) return pushToast("warning", "Describe la solución aplicada");
    setBusy(true);
    try {
      await api.put(`/tickets/${atendiendo.id}`, { estado: "RESUELTO", solucion });
      pushToast("success", `${atendiendo.numero} resuelto`);
      setAtendiendo(null);
      setSolucion("");
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tickets de soporte"
        subtitle="Reporta y da seguimiento a incidentes y requerimientos técnicos"
        icon="headset"
        actions={
          <div className="d-flex gap-2">
            <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => { setPage(1); setFiltro(e.target.value); }}>
              <option value="">Todos</option>
              <option value="ABIERTO">Abiertos</option>
              <option value="RESUELTO">Resueltos</option>
            </select>
            <button className="btn btn-sm btn-brand" onClick={() => setCreando(true)}>
              <i className="bi bi-plus-lg me-1" /> Nuevo ticket
            </button>
          </div>
        }
      />

      <Card title={`Tickets (${data?.total ?? 0})`} icon="life-preserver">
        {loading ? (
          <div className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="headset" title="Sin tickets" hint="Crea tu primer ticket de soporte" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Fecha</th><th>Solicitante</th><th>Categoría</th><th>Prioridad</th><th>Descripción</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td><span className="fw-semibold">{t.numero}</span></td>
                    <td className="text-secondary small">{fmtDateTime(t.fecha)}</td>
                    <td className="small">{t.solicitante || "—"}</td>
                    <td className="small">{t.categoria || "—"}</td>
                    <td><Badge estado={{ label: t.prioridad, cls: PRIORIDAD[t.prioridad] || "secondary" }} /></td>
                    <td className="small text-secondary text-truncate" style={{ maxWidth: 280 }}>{t.descripcion || "—"}</td>
                    <td><Badge estado={estadoInfo(t.estado)} /></td>
                    <td className="text-end">
                      {t.estado !== "RESUELTO" && can("registrar_mantenimiento") && (
                        <button className="btn btn-sm btn-soft" onClick={() => setAtendiendo(t)}>
                          <i className="bi bi-check2-circle me-1" /> Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-2 border-top">
            <small className="text-secondary">Página {page} de {pages}</small>
            <div className="btn-group btn-group-sm">
              <button className="btn btn-light" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
              <button className="btn btn-light" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={creando} title="Nuevo ticket de soporte" icon="plus-circle" onClose={() => setCreando(false)} busy={busy}
        footer={
          <>
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => setCreando(false)}>Cancelar</button>
            <button className="btn btn-sm btn-brand" disabled={busy} onClick={crear}>
              <i className="bi bi-send me-1" /> Crear ticket
            </button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Sede</label>
            <select className="form-select" value={form.sede_id} onChange={(e) => setForm({ ...form, sede_id: e.target.value })}>
              <option value="">Sin sede</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Prioridad</label>
            <select className="form-select" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Solicitante</label>
            <input className="form-control" value={form.solicitante} onChange={(e) => setForm({ ...form, solicitante: e.target.value })} placeholder="Nombre (opcional)" />
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Categoría</label>
            <input className="form-control" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: Red, Impresora, Software" />
          </div>
          <div className="col-12">
            <label className="form-label small fw-semibold">Descripción del problema *</label>
            <textarea className="form-control" rows={4} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe el incidente o requerimiento" />
          </div>
        </div>
      </Modal>

      <Modal open={!!atendiendo} title={`Resolver ${atendiendo?.numero || ""}`} icon="wrench" onClose={() => setAtendiendo(null)} busy={busy}
        footer={
          <>
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => setAtendiendo(null)}>Cancelar</button>
            <button className="btn btn-sm btn-brand" disabled={busy} onClick={resolver}>
              <i className="bi bi-check2-circle me-1" /> Marcar resuelto
            </button>
          </>
        }
      >
        <div className="mb-2 p-2 rounded-3 bg-light small text-secondary">{atendiendo?.descripcion}</div>
        <label className="form-label small fw-semibold">Solución aplicada *</label>
        <textarea className="form-control" rows={4} value={solucion} onChange={(e) => setSolucion(e.target.value)} placeholder="Describe cómo se resolvió" />
      </Modal>
    </div>
  );
}