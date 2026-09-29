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
  const [serialesCierre, setSerialesCierre] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [serialesManuales, setSerialesManuales] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [actaConFotos, setActaConFotos] = useState(true);
  const [subiendo, setSubiendo] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progOpen, setProgOpen] = useState(false);
  const [prog, setProg] = useState({
    destino: "sede", sedeId: "", activo: null, q: "", tipo: "PREVENTIVO", cantidad: 1, seriales: [],
    fecha_programada: new Date().toISOString().slice(0, 10), proposito: "", diagnostico: "", actividades: "",
  });

  const loader = useMemo(
    () => api.get(`/activos/mantenimientos${filtro ? `?estado=${filtro}` : ""}`),
    [filtro]
  );
  const { data, loading, reload } = useAsync(() => loader, [filtro]);
  const items = data || [];

  const activosQ = useMemo(
    () => (prog.destino === "activo" && prog.q.trim() ? api.get(`/activos?q=${encodeURIComponent(prog.q.trim())}&size=12`) : Promise.resolve({ data: { items: [] } })),
    [prog.destino, prog.q]
  );
  const activos = useAsync(() => activosQ, [prog.q, prog.destino]);

  const sedesQ = useMemo(() => api.get("/geo/sedes"), []);
  const sedes = useAsync(() => sedesQ, []);

  const abrirCerrar = (m) => {
    setCerrando(m);
    setFotos([]);
    setSerialesManuales([]);
    setManualOpen(false);
    setActaConFotos(true);
    setSubiendo(0);
    setSerialesCierre(m.seriales || []);
    setForm({ resultado: "", observaciones: "", costo: "", proxima_fecha: m.proxima_fecha ? m.proxima_fecha.slice(0, 10) : "" });
  };

  const resetProg = () => setProg({
    destino: "sede", sedeId: "", activo: null, q: "", tipo: "PREVENTIVO", cantidad: 1, seriales: [],
    fecha_programada: new Date().toISOString().slice(0, 10), proposito: "", diagnostico: "", actividades: "",
  });

  const seleccionarDestino = (obj, tipo) => {
    if (tipo === "activo") {
      setProg((p) => ({ ...p, destino: "activo", activo: obj, q: `${obj.codigo}${obj.serial ? ` · ${obj.serial}` : ""}`, seriales: obj.serial ? [obj.serial] : [] }));
    }
  };

  const guardarProgramado = async () => {
    const objetivo = prog.destino === "sede" ? prog.sedeId : prog.activo;
    if (!objetivo) return pushToast("warning", "Selecciona la sede (farmacia) o el activo a mantener");
    setBusy(true);
    try {
      const cantidad = prog.seriales.length > 0 ? prog.seriales.length : Number(prog.cantidad || 1);
      const body = {
        tipo: prog.tipo,
        cantidad,
        seriales: prog.seriales.length > 0 ? prog.seriales : null,
        fecha_programada: prog.fecha_programada ? new Date(prog.fecha_programada).toISOString() : null,
        proposito: prog.proposito || null,
        diagnostico: prog.diagnostico || null,
        actividades: prog.actividades || null,
      };
      if (prog.destino === "sede") body.sede_id = Number(prog.sedeId);
      else body.activo_id = prog.activo.id;
      const sedeSel = sedes.data?.find((s) => s.id === Number(prog.sedeId));
      const nombre = prog.destino === "sede" ? (sedeSel?.nombre || `#${prog.sedeId}`) : prog.activo.codigo;
      await api.post("/activos/mantenimientos", body);
      pushToast("success", `Mantenimiento programado en ${nombre}`);
      setProgOpen(false);
      resetProg();
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
      for (const f of fotos) {
        await api.upload(`/archivos/mantenimiento/${cerrando.id}`, f.file, { serial: f.serial || "" }, (p) => setSubiendo(p));
      }
      await api.put(`/activos/mantenimientos/${cerrando.id}/cerrar`, {
        resultado: form.resultado,
        observaciones: form.observaciones,
        costo: form.costo ? Number(form.costo) : null,
        proxima_fecha: form.proxima_fecha ? new Date(form.proxima_fecha).toISOString() : null,
        seriales: serialesCierre.length > 0 ? serialesCierre : null,
        acta_con_fotos: actaConFotos,
      });
      pushToast("success", `Mantenimiento ${cerrando.numero} cerrado con acta`);
      setCerrando(null);
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
      setSubiendo(0);
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
        subtitle={`${abiertos} en curso · programados por farmacia, sede o activo`}
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
          <EmptyState icon="wrench" title="Sin mantenimientos" hint="Programa un mantenimiento a una farmacia o activo" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Farmacia / Activo</th><th>Tipo</th><th>Cant.</th><th>Seriales</th><th>Programado</th><th>Ejecutado</th><th>Costo</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td><span className="fw-semibold">{m.numero}</span></td>
                    <td>{m.activo ? <Link to={`/activos/${m.activo.id}`} className="fw-semibold">{m.activo.codigo}</Link> : (m.sede ? <span className="fw-semibold">{m.sede.nombre}</span> : (m.ubicacion ? <span className="fw-semibold">{m.ubicacion.nombre}</span> : `#${m.id}`))}</td>
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
        size="lg"
        onClose={() => setCerrando(null)}
        busy={busy}
        footer={
          <>
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => setCerrando(null)}>Cancelar</button>
            <button className="btn btn-sm btn-brand" disabled={busy} onClick={cerrar}>
              {busy ? (subiendo > 0 ? `Subiendo fotos… ${subiendo}%` : "Guardando…") : "Cerrar y generar acta"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label small fw-semibold">Resultado *</label>
          <textarea className="form-control" rows={3} value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} placeholder="Describe qué se hizo y el estado final del equipo" />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold">Seriales atendidos (para el acta)</label>
          <SerialListInput value={serialesCierre} onChange={setSerialesCierre} placeholder="Serial del equipo mantenido…" />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold">Fotos de los seriales</label>
          <div className="d-flex align-items-start gap-2 flex-wrap">
            <label className="btn btn-sm btn-soft mb-0">
              <i className="bi bi-camera me-1" /> {fotos.length ? `Agregar fotos (${fotos.length})` : "Subir fotos"}
              <input
                type="file" accept="image/*" multiple className="d-none"
                onChange={(e) => {
                  const fs = Array.from(e.target.files || []);
                  if (!fs.length) return;
                  setFotos((prev) => [...prev, ...fs.map((file) => ({ file, serial: "" }))]);
                  fs.forEach((file) => {
                    const id = URL.createObjectURL(file);
                    api.upload("/archivos/extraer-serial", file, {}, () => {})
                      .then((r) => {
                        const serial = r?.data?.serial;
                        URL.revokeObjectURL(id);
                        if (!serial) return;
                        setFotos((prev) => prev.map((x) => (x.file === file && !x.serial ? { ...x, serial } : x)));
                      })
                      .catch(() => URL.revokeObjectURL(id));
                  });
                  e.target.value = "";
                }}
              />
            </label>
            <button type="button" className="btn btn-sm btn-light mb-0 text-nowrap" onClick={() => setManualOpen((v) => !v)}>
              <i className="bi bi-pencil-square me-1" /> {manualOpen ? "Ocultar seriales manuales" : "Colocar seriales manualmente"}
            </button>
            {fotos.length > 0 && (
              <button type="button" className="btn btn-sm btn-outline-brand mb-0 text-nowrap" onClick={() => setFotos([])}>
                <i className="bi bi-trash me-1" /> Quitar todas
              </button>
            )}
          </div>

          {manualOpen && (
            <div className="eticos-card mt-2 p-2">
              <SerialListInput
                value={serialesManuales}
                onChange={setSerialesManuales}
                placeholder="Escribe o pega seriales (Enter)…"
              />
              <div className="d-flex align-items-center gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-brand"
                  disabled={!serialesManuales.length}
                  onClick={() => {
                    setFotos((prev) =>
                      prev.map((x, j) => (j < serialesManuales.length ? { ...x, serial: serialesManuales[j] } : x))
                    );
                    pushToast("success", "Seriales asignados a las fotos en orden");
                  }}
                >
                  <i className="bi bi-link-45deg me-1" /> Asignar a las fotos en orden
                </button>
                {fotos.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => setSerialesCierre([...new Set([...serialesCierre, ...serialesManuales])])}
                  >
                    Agregar a la lista del acta
                  </button>
                )}
              </div>
              <div className="form-text">El sistema detecta el serial automáticamente cuando la etiqueta es legible (SN, Serial No., Nº serie…). Con esta opción puedes escribirlos o pegarlos y asignarlos en orden a cada foto.</div>
            </div>
          )}

          {fotos.length > 0 && (
            <div className="d-flex flex-wrap gap-2 align-items-start mt-2">
              {fotos.map((f, i) => (
                <div key={i} className="d-flex flex-column align-items-center gap-1 p-2 border rounded" style={{ width: 150, background: "#fafbff" }}>
                  <img
                    src={URL.createObjectURL(f.file)}
                    alt={f.file.name}
                    className="img-thumbnail"
                    style={{ width: "100%", height: 90, objectFit: "cover", cursor: "zoom-in" }}
                    onClick={() => window.open(URL.createObjectURL(f.file))}
                  />
                  <div className="w-100 d-flex gap-1 align-items-center">
                    <input
                      className="form-control form-control-sm"
                      placeholder="Serial"
                      value={f.serial}
                      onChange={(e) => setFotos((prev) => prev.map((x, j) => (j === i ? { ...x, serial: e.target.value } : x)))}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-light p-1"
                      title="Eliminar foto"
                      onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <i className="bi bi-trash text-danger"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="form-text mt-1">Cada foto se asocia a un serial para que el acta las liste correctamente. El OCR rellena el serial automáticamente si se lee "SN:", "Serial No.", "Nº serie", etc.</div>
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold">Modo del acta</label>
          <div className="btn-group w-100" role="group">
            <button type="button" className={"btn btn-sm " + (actaConFotos ? "btn-brand" : "btn-outline-brand")} onClick={() => setActaConFotos(true)}>
              <i className="bi bi-file-image me-1" /> Con imágenes
            </button>
            <button type="button" className={"btn btn-sm " + (!actaConFotos ? "btn-brand" : "btn-outline-brand")} onClick={() => setActaConFotos(false)}>
              <i className="bi bi-file-earmark-text me-1" /> Sin imágenes
            </button>
          </div>
          <div className="form-text">"Con imágenes" incluye el registro fotográfico en el acta PDF; "Sin imágenes" genera el acta solo con texto.</div>
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
            <div className="btn-group btn-group-sm mb-2" role="group">
              <button type="button" className={`btn ${prog.destino === "sede" ? "btn-brand" : "btn-light"}`} onClick={() => setProg((p) => ({ ...p, destino: "sede", q: "", activo: null }))}>
                <i className="bi bi-shop me-1" /> Farmacia / Sede
              </button>
              <button type="button" className={`btn ${prog.destino === "activo" ? "btn-brand" : "btn-light"}`} onClick={() => setProg((p) => ({ ...p, destino: "activo", q: "", activo: null }))}>
                <i className="bi bi-cpu me-1" /> Activo
              </button>
            </div>
            {prog.destino === "sede" ? (
              <>
                <label className="form-label small fw-semibold">Sede *</label>
                {sedes.loading ? (
                  <div className="text-center py-2"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
                ) : (sedes.data || []).length === 0 ? (
                  <div className="text-secondary small py-2">No hay sedes. Créalas en Geografía → Sedes y ubicaciones.</div>
                ) : (
                  <select
                    className="form-select"
                    value={prog.sedeId}
                    onChange={(e) => setProg((p) => ({ ...p, sedeId: e.target.value }))}
                  >
                    <option value="">— Selecciona la sede / farmacia —</option>
                    {(sedes.data || [])
                      .filter((s) => s.estado !== "INACTIVA")
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>
                      ))}
                  </select>
                )}
              </>
            ) : (
              <>
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
                        <button key={a.id} type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onClick={() => seleccionarDestino(a, "activo")}>
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
              </>
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
            <label className="form-label small fw-semibold">Seriales (opcional al programar)</label>
            <SerialListInput value={prog.seriales} onChange={(seriales) => setProg((p) => ({ ...p, seriales }))} />
            <div className="form-text">Los seriales atendidos se registran en el cierre; aquí solo si ya los conoces.</div>
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