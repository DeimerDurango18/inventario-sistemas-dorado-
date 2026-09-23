import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import { Badge, Card, EmptyState, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDate, fmtMoney } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function Mantenimientos() {
  const { can } = useAuth();
  const { pushToast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [cerrando, setCerrando] = useState(null);
  const [form, setForm] = useState({ resultado: "", observaciones: "", costo: "", proxima_fecha: "" });
  const [busy, setBusy] = useState(false);

  const loader = useMemo(
    () => api.get(`/activos/mantenimientos${filtro ? `?estado=${filtro}` : ""}`),
    [filtro]
  );
  const { data, loading, reload } = useAsync(() => loader, [filtro]);
  const items = data || [];

  const abrirCerrar = (m) => {
    setCerrando(m);
    setForm({ resultado: "", observaciones: "", costo: "", proxima_fecha: m.proxima_fecha ? m.proxima_fecha.slice(0, 10) : "" });
  };

  const cerrar = async () => {
    if (!form.resultado.trim()) return pushToast("warning", "Indica el resultado del mantenimiento");
    setBusy(true);
    try {
      await api.put(`/activos/mantenimientos/${cerrando.id}/cerrar`, {
        resultado: form.resultado,
        observaciones: form.observaciones,
        costo: form.costo ? Number(form.costo) : null,
        proxima_fecha: form.proxima_fecha ? new Date(form.proxima_fecha).toISOString() : null,
      });
      pushToast("success", `Mantenimiento ${cerrando.numero} cerrado`);
      setCerrando(null);
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const descargarActas = async (m) => {
    try {
      if (!m.acta_id) return pushToast("warning", "Este mantenimiento no tiene acta generada");
      await downloadFile(`/activos/actas/${m.acta_id}/pdf`, `acta-${m.numero}.pdf`);
    } catch (e) { pushToast("error", e.message); }
  };

  const abiertos = items.filter((m) => m.estado !== "COMPLETADO").length;

  return (
    <div>
      <PageHeader
        title="Mantenimientos"
        subtitle={`${abiertos} en curso · programados y preventivos de tu flota`}
        icon="wrench-adjustable"
        actions={
          <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PROGRAMADO">Programado</option>
            <option value="EN_PROGRESO">En progreso</option>
            <option value="COMPLETADO">Completado</option>
          </select>
        }
      />

      <Card title={`Mantenimientos (${items.length})`} icon="clipboard-check">
        {loading ? (
          <div className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="wrench" title="Sin mantenimientos" hint="Registra mantenimientos desde el detalle de un activo" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Activo</th><th>Tipo</th><th>Programado</th><th>Ejecutado</th><th>Costo</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td><span className="fw-semibold">{m.numero}</span></td>
                    <td>{m.activo ? <Link to={`/activos/${m.activo.id}`} className="fw-semibold">{m.activo.codigo}</Link> : `#${m.activo_id}`}</td>
                    <td className="small">{m.tipo}</td>
                    <td className="text-secondary small">{fmtDate(m.fecha_programada)}</td>
                    <td className="text-secondary small">{fmtDate(m.fecha_ejecucion)}</td>
                    <td>{m.costo ? fmtMoney(m.costo) : "—"}</td>
                    <td><Badge estado={estadoInfo(m.estado)} /></td>
                    <td className="text-end">
                      {m.estado !== "COMPLETADO" && can("registrar_mantenimiento") && (
                        <button className="btn btn-sm btn-soft" onClick={() => abrirCerrar(m)}>
                          <i className="bi bi-check2-circle me-1" /> Cerrar
                        </button>
                      )}
                      {m.acta_id && (
                        <button className="btn btn-sm btn-light ms-1" title="Descargar acta" onClick={() => descargarActas(m)}>
                          <i className="bi bi-file-earmark-pdf text-danger"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!cerrando}
        title={`Cerrar mantenimiento ${cerrando?.numero || ""}`}
        icon="check2-circle"
        onClose={() => setCerrando(null)}
        busy={busy}
        footer={
          <>
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => setCerrando(null)}>Cancelar</button>
            <button className="btn btn-sm btn-brand" disabled={busy} onClick={cerrar}>
              {busy ? "Guardando…" : "Cerrar mantenimiento"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label small fw-semibold">Resultado *</label>
          <textarea className="form-control" rows={3} value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} placeholder="Describe qué se hizo y el estado final del equipo" />
        </div>
        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Costo ($)</label>
            <input type="number" className="form-control" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="0" />
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Próxima fecha</label>
            <input type="date" className="form-control" value={form.proxima_fecha} onChange={(e) => setForm({ ...form, proxima_fecha: e.target.value })} />
          </div>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Observaciones</label>
          <input className="form-control" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}