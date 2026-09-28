import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import SerialListInput from "../../components/SerialListInput";
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
  const [progOpen, setProgOpen] = useState(false);
  const [prog, setProg] = useState({ q: "", activo: null, tipo: "PREVENTIVO", cantidad: 1, seriales: [], fecha_programada: new Date().toISOString().slice(0, 10), proposito: "", diagnostico: "", actividades: "" });

  const loader = useMemo(
    () => api.get(`/activos/mantenimientos${filtro ? `?estado=${filtro}` : ""}`),
    [filtro]
  );
  const { data, loading, reload } = useAsync(() => loader, [filtro]);
  const items = data || [];

  const activosQ = useMemo(
    () => (prog.q.trim() ? api.get(`/activos?q=${encodeURIComponent(prog.q.trim())}&size=12`) : Promise.resolve({ data: { items: [] } })),
    [prog.q]
  );
  const activos = useAsync(() => activosQ, [prog.q]);

  const abrirCerrar = (m) => {
    setCerrando(m);
    setForm({ resultado: "", observaciones: "", costo: "", proxima_fecha: m.proxima_fecha ? m.proxima_fecha.slice(0, 10) : "" });
  };

  const seleccionarActivo = (a) => {
    setProg((p) => ({ ...p, activo: a, q: `${a.codigo}${a.serial ? ` · ${a.serial}` : ""}`, seriales: a.serial ? [a.serial] : [] }));
  };

  const guardarProgramado = async () => {
    if (!prog.activo) return pushToast("warning", "Selecciona el activo a mantener");
    setBusy(true);
    try {
      const cantidad = prog.seriales.length > 0 ? prog.seriales.length : Number(prog.cantidad || 1);
      await api.post(`/activos/${prog.activo.id}/mantenimientos`, {
        tipo: prog.tipo,
        cantidad,
        seriales: prog.seriales.length > 0 ? prog.seriales : null,
        fecha_programada: prog.fecha_programada ? new Date(prog.fecha_programada).toISOString() : null,
        proposito: prog.proposito || null,
        diagnostico: prog.diagnostico || null,
        actividades: prog.actividades || null,
      });
      pushToast("success", `Mantenimiento programado para ${prog.activo.codigo}`);
      setProgOpen(false);
      setProg({ q: "", activo: null, tipo: "PREVENTIVO", cantidad: 1, seriales: [], fecha_programada: new Date().toISOString().slice(0, 10), proposito: "", diagnostico: "", actividades: "" });
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
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
          <>
            <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="PROGRAMADO">Programado</option>
              <option value="EN_PROGRESO">En progreso</option>
              <option value="COMPLETADO">Completado</option>
            </select>
            {can("registrar_mantenimiento") && (
              <button className="btn btn-sm btn-brand" onClick={() => setProgOpen(true)}>
                <i className="bi bi-plug me-1" /> Programar mantenimiento
              </button>
            )}
          </>
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
                <th>Número</th><th>Activo</th><th>Tipo</th><th>Cant.</th><th>Seriales</th><th>Programado</th><th>Ejecutado</th><th>Costo</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td><span className="fw-semibold">{m.numero}</span></td>
                    <td>{m.activo ? <Link to={`/activos/${m.activo.id}`} className="fw-semibold">{m.activo.codigo}</Link> : `#${m.activo_id}`}</td>
                    <td className="small">{m.tipo}</td>
                    <td className="small">{m.cantidad || 1}</td>
                    <td className="small">{(m.seriales || []).length ? m.seriales.join(", ") : "—"}</td>
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

      <Modal
        open={progOpen}
        title="Programar mantenimiento"
        icon="plug"
        size="lg"
        onClose={() => setProgOpen(false)}
        busy={busy}
        footer={
          <>
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => setProgOpen(false)}>Cancelar</button>
            <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardarProgramado}>
              {busy ? "Guardando…" : "Programar mantenimiento"}
            </button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label small fw-semibold">Activo *</label>
            <input
              className="form-control"
              placeholder="Busca por código, serial o descripción…"
              value={prog.q}
              onChange={(e) => setProg((p) => ({ ...p, q: e.target.value, activo: null }))}
            />
            {prog.activo && (
              <div className="d-flex flex-wrap gap-1 mt-2">
                <span className="badge eta-badge fw-semibold" style={{ background: "#e9f2fc", color: "#0b66c2", border: "1px solid #0b66c240" }}>
                  {prog.activo.codigo}{prog.activo.serial ? ` · ${prog.activo.serial}` : ""}
                  <button type="button" className="border-0 bg-transparent p-0 lh-1 ms-1" style={{ color: "inherit" }} title="Quitar" onClick={() => setProg((p) => ({ ...p, activo: null, q: "" }))}>
                    <i className="bi bi-x"></i>
                  </button>
                </span>
              </div>
            )}
            {!prog.activo && prog.q.trim() && (
              <div className="list-group list-group-flush eticos-card mt-1" style={{ maxHeight: 220, overflowY: "auto" }}>
                {activos.loading ? (
                  <div className="text-center py-3"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
                ) : (activos.data?.items || []).length === 0 ? (
                  <div className="text-center py-3 text-secondary small">Sin coincidencias</div>
                ) : (
                  (activos.data?.items || []).map((a) => (
                    <button key={a.id} type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onClick={() => seleccionarActivo(a)}>
                      <span>
                        <span className="fw-semibold">{a.codigo}</span>
                        {a.serial && <span className="text-secondary small ms-2">{a.serial}</span>}
                      </span>
                      <small className="text-secondary">{a.tipo}{a.marca?.nombre ? ` · ${a.marca.nombre}` : ""}</small>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label small fw-semibold">Tipo *</label>
            <select className="form-select" value={prog.tipo} onChange={(e) => setProg((p) => ({ ...p, tipo: e.target.value }))}>
              <option value="PREVENTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
              <option value="PREDICTIVO">Predictivo</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Fecha programada</label>
            <input type="date" className="form-control" value={prog.fecha_programada} onChange={(e) => setProg((p) => ({ ...p, fecha_programada: e.target.value }))} />
          </div>

          <div className="col-12">
            <label className="form-label small fw-semibold">Seriales del equipo</label>
            <SerialListInput value={prog.seriales} onChange={(seriales) => setProg((p) => ({ ...p, seriales }))} />
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Cantidad</label>
            {prog.seriales.length > 0 ? (
              <div className="form-control">
                <span className="fw-semibold">{prog.seriales.length}</span>
                <span className="text-secondary small ms-1">(calculada de los seriales)</span>
              </div>
            ) : (
              <input type="number" min="1" className="form-control" value={prog.cantidad} onChange={(e) => setProg((p) => ({ ...p, cantidad: Number(e.target.value) }))} />
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Propósito</label>
            <input className="form-control" value={prog.proposito} onChange={(e) => setProg((p) => ({ ...p, proposito: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Diagnóstico</label>
            <input className="form-control" value={prog.diagnostico} onChange={(e) => setProg((p) => ({ ...p, diagnostico: e.target.value }))} />
          </div>
          <div className="col-12">
            <label className="form-label small fw-semibold">Actividades a realizar</label>
            <textarea className="form-control" rows={2} value={prog.actividades} onChange={(e) => setProg((p) => ({ ...p, actividades: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}