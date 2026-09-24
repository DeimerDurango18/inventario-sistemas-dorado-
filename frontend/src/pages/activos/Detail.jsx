import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal, EmptyState, Modal, PageHeader } from "../../components/ui";
import { fmtDate, fmtDateTime, fmtMoney, estadoColor } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import ResponsablesModal from "./ResponsablesModal";
import SerialListInput from "../../components/SerialListInput";

function Badge({ estado }) {
  const [c, bg] = estadoColor(estado);
  return <span className="badge eta-badge" style={{ background: bg, color: c }}>{estado}</span>;
}

export default function ActivoDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [a, setA] = useState(null);
  const [data, setData] = useState({ movs: [], prestamos: [], mants: [], garantias: [], bajas: [], archivos: [] });
  const [qrSrc, setQrSrc] = useState(null);
  const [tab, setTab] = useState("historial");
  const [showResp, setShowResp] = useState(false);
  const [modal, setModal] = useState(null); // {tipo, item}
  const [anular, setAnular] = useState(null);
  const [adjuntando, setAdjuntando] = useState(null);

  const loadAll = useCallback(async () => {
    const [activo, movs, prestamos, mants, garantias, bajas, archivos] = await Promise.allSettled([
      api.get(`/activos/${id}`),
      api.get(`/activos/movimientos?activo_id=${id}`),
      api.get(`/activos/prestamos?activo_id=${id}`),
      api.get(`/activos/mantenimientos?activo_id=${id}`),
      api.get(`/activos/garantias?activo_id=${id}`),
      api.get(`/activos/bajas?activo_id=${id}`),
      api.get(`/archivos/activo/${id}`),
    ]);
    setA(activo.status === "fulfilled" ? activo.value.data : null);
    setData({
      movs: movs.status === "fulfilled" ? movs.value.data?.items || movs.value.data || [] : [],
      prestamos: prestamos.status === "fulfilled" ? prestamos.value.data || [] : [],
      mants: mants.status === "fulfilled" ? mants.value.data || [] : [],
      garantias: garantias.status === "fulfilled" ? garantias.value.data || [] : [],
      bajas: bajas.status === "fulfilled" ? bajas.value.data || [] : [],
      archivos: archivos.status === "fulfilled" ? archivos.value.data || [] : [],
    });
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    let url = null;
    if (!a) return undefined;
    api.blob(`/activos/${a.id}/qr`)
      .then((r) => { if (r.blob) { url = URL.createObjectURL(r.blob); setQrSrc(url); } })
      .catch(() => setQrSrc(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [a?.id, a]);

  if (!a) return <div className="text-center mt-5"><div className="spinner-border text-primary" /></div>;

  const cantRegistrar = can("crear_movimientos");
  const cantMant = can("registrar_mantenimiento");
  const cantAprobar = can("aprobar_movimientos");
  const cantEditar = can("editar_activos");

  return (
    <div>
      <PageHeader
        title={`${a.codigo} · ${a.estado?.nombre || ""}`}
        subtitle={`${a.tipo}${a.serial ? " · Serial " + a.serial : ""}`}
        icon="box-seam"
        actions={
          <>
            {cantEditar && (
              <Link to={`/activos/${a.id}/editar`} className="btn btn-sm btn-light me-1">
                <i className="bi bi-pencil me-1 text-primary" /> Editar
              </Link>
            )}
            {cantRegistrar && (
              <button className="btn btn-sm btn-brand" onClick={() => setModal({ tipo: "movimiento" })}>
                <i className="bi bi-arrow-left-right me-1" /> Registrar movimiento
              </button>
            )}
          </>
        }
      />

      <div className="row g-3 mt-0">
        <div className="col-lg-8">
          <div className="eticos-card mb-3">
            <div className="p-3">
              <h6 className="text-secondary small text-uppercase fw-bold mb-3"><i className="bi bi-info-circle me-1"></i>Información del activo</h6>
              <div className="row g-3">
                <F label="Tipo" v={a.tipo} />
                <F label="Código inventario" v={a.codigo_inventario} />
                <F label="Serial" v={a.serial} />
                <F label="Categoría" v={a.categoria?.nombre || a.subcategoria?.nombre} />
                <F label="Marca" v={a.marca?.nombre} />
                <F label="Modelo" v={a.modelo?.nombre} />
                <F label="Placa" v={a.placa} />
                <F label="Stock" v={a.cantidad_stock ?? 0} />
                <F label="Estado" v={a.estado?.nombre} />
                <F label="Sede" v={a.ubicacion?.sede?.nombre} />
                <F label="Ubicación" v={a.ubicacion?.nombre} />
                <F label="Responsable" v={a.responsable?.nombre} />
                <F label="Proveedor" v={a.proveedor?.nombre} />
                <F label="Valor adquisición" v={fmtMoney(a.valor_adquisicion)} />
                <F label="Factura" v={a.factura_numero} />
                <F label="Fecha adquisición" v={fmtDate(a.fecha_adquisicion)} />
                <F label="Fecha ingreso" v={fmtDate(a.fecha_ingreso)} />
                <F label="Garantía hasta" v={fmtDate(a.fecha_fin_garantia)} />
                <F label="QR hash" v={a.qr_hash} />
              </div>
              {a.observaciones && <div className="mt-3 small text-secondary border-top pt-2">Notas: {a.observaciones}</div>}
            </div>
          </div>

          <div className="eticos-card">
            <div className="p-3 pt-2">
              <ul className="nav nav-tabs border-0 gap-1">
                <TabBtn active={tab === "historial"} onClick={() => setTab("historial")} icon="arrow-left-right" label={`Historial (${data.movs.length})`} />
                <TabBtn active={tab === "prestamos"} onClick={() => setTab("prestamos")} icon="hand-index" label={`Préstamos (${data.prestamos.length})`} />
                <TabBtn active={tab === "mant"} onClick={() => setTab("mant")} icon="wrench" label={`Mantenimientos (${data.mants.length})`} />
                <TabBtn active={tab === "garantia"} onClick={() => setTab("garantia")} icon="shield" label={`Garantías (${data.garantias.length})`} />
                <TabBtn active={tab === "bajas"} onClick={() => setTab("bajas")} icon="trash" label={`Bajas (${data.bajas.length})`} />
              </ul>
              <div className="pt-3">
                {tab === "historial" && (
                  <MovsTable rows={data.movs} onAnular={cantAprobar ? setAnular : null} />
                )}
                {tab === "prestamos" && (
                  <>
                    {can("crear_movimientos") && (
                      <div className="mb-2">
                        <button className="btn btn-sm btn-outline-brand" onClick={() => setModal({ tipo: "prestamo" })}><i className="bi bi-plus-lg me-1" /> Nuevo préstamo</button>
                      </div>
                    )}
                    <PrestamosTable rows={data.prestamos} canAprobar={cantAprobar} onAprobar={async (p) => {
                      try {
                        await api.put(`/activos/prestamos/${p.id}/aprobar`);
                        pushToast("success", "Préstamo aprobado");
                        loadAll();
                      } catch (e) { pushToast("error", e.message); }
                    }} onRechazar={cantAprobar ? async (p) => {
                      try {
                        await api.put(`/activos/prestamos/${p.id}/rechazar`);
                        pushToast("success", "Préstamo rechazado");
                        loadAll();
                      } catch (e) { pushToast("error", e.message); }
                    } : undefined} onDevolver={cantAprobar ? async (p) => {
                      try {
                        await api.put(`/activos/prestamos/${p.id}/devolver`);
                        pushToast("success", "Devolución registrada");
                        loadAll();
                      } catch (e) { pushToast("error", e.message); }
                    } : undefined} />
                  </>
                )}
                {tab === "mant" && (
                  <>
                    {(can("registrar_mantenimiento")) && (
                      <div className="mb-2">
                        <button className="btn btn-sm btn-outline-brand" onClick={() => setModal({ tipo: "mantenimiento" })}><i className="bi bi-plus-lg me-1" /> Programar mantenimiento</button>
                      </div>
                    )}
                    <MantsTable rows={data.mants} onCerrar={can("registrar_mantenimiento") ? setModal : null} />
                  </>
                )}
                {tab === "garantia" && (
                  <>
                    {can("crear_activos") && (
                      <div className="mb-2">
                        <button className="btn btn-sm btn-outline-brand" onClick={() => setModal({ tipo: "garantia" })}><i className="bi bi-plus-lg me-1" /> Registrar garantía</button>
                      </div>
                    )}
                    <GarantiasTable rows={data.garantias} />
                  </>
                )}
                {tab === "bajas" && (
                  <>
                    {can("crear_movimientos") && (
                      <div className="mb-2">
                        <button className="btn btn-sm btn-outline-brand" onClick={() => setModal({ tipo: "baja" })}><i className="bi bi-plus-lg me-1" /> Solicitar baja</button>
                      </div>
                    )}
                    <BajasTable rows={data.bajas} canAprobar={cantAprobar} onAprobar={async (b) => {
                      try {
                        await api.put(`/activos/bajas/${b.id}/aprobar`);
                        pushToast("success", "Baja aprobada");
                        loadAll();
                      } catch (e) { pushToast("error", e.message); }
                    }} onRechazar={cantAprobar ? async (b) => {
                      try {
                        await api.put(`/activos/bajas/${b.id}/rechazar`);
                        pushToast("success", "Baja rechazada");
                        loadAll();
                      } catch (e) { pushToast("error", e.message); }
                    } : undefined} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="eticos-card mb-3">
            <div className="p-3 text-center">
              <div className="text-secondary small mb-2 fw-semibold">Código QR</div>
              {qrSrc ? (
                <img src={qrSrc} alt="QR" width={150} height={150} className="border rounded bg-white" />
              ) : (
                <div className="text-secondary small py-4"><i className="bi bi-qr-code me-1"></i>No disponible</div>
              )}
              <div className="mt-2">
                <button className="btn btn-sm btn-light" disabled={!qrSrc} onClick={async () => {
                  try {
                    await downloadFile(`/activos/${a.id}/qr`, `${a.codigo}.png`);
                  } catch (e) { pushToast("error", e.message); }
                }}><i className="bi bi-download me-1 text-primary"></i>Descargar</button>
              </div>
            </div>
          </div>

          <div className="eticos-card mb-3">
            <div className="p-3">
              <h6 className="text-secondary small text-uppercase fw-bold mb-2"><i className="bi bi-paperclip me-1"></i>Adjuntos ({data.archivos.length})</h6>
              <div className="d-flex gap-2 mb-2">
                {cantEditar && (
                  <label className="btn btn-sm btn-brand mb-0">
                    <i className="bi bi-upload me-1" /> Adjuntar archivo
                    <input type="file" className="d-none" onChange={(e) => { const f = e.target.files[0]; if (f) setAdjuntando(f); e.target.value = ""; }} />
                  </label>
                )}
                <button className="btn btn-sm btn-light" onClick={() => setShowResp(true)}><i className="bi bi-person-plus me-1"></i>Responsables</button>
              </div>
              {data.archivos.length === 0 ? (
                <div className="small text-secondary py-2">Sin adjuntos. Adjunta facturas, manuales o actas.</div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {data.archivos.map((f) => (
                    <li key={f.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                      <i className="bi bi-file-earmark text-secondary"></i>
                      <div className="flex-grow-1 small" style={{ maxWidth: 190 }}>
                        <div className="text-truncate">{f.nombre_original}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{(f.tamano / 1024).toFixed(1)} KB · {f.created_at ? fmtDateTime(f.created_at) : ""}</div>
                      </div>
                      <button className="btn btn-sm btn-light p-1" title="Descargar" onClick={async () => {
                        try {
                          await downloadFile(`/archivos/${f.id}/descargar`);
                        } catch (e) { pushToast("error", e.message); }
                      }}><i className="bi bi-download text-primary"></i></button>
                      {cantEditar && (
                        <button className="btn btn-sm btn-light p-1" title="Eliminar" onClick={async () => {
                          try {
                            await api.del(`/archivos/${f.id}`);
                            pushToast("success", "Adjunto eliminado");
                            loadAll();
                          } catch (e) { pushToast("error", e.message); }
                        }}><i className="bi bi-x text-danger"></i></button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="eticos-card">
            <div className="p-3">
              <h6 className="text-secondary small text-uppercase fw-bold mb-2"><i className="bi bi-speedometer2 me-1"></i>Acciones rápidas</h6>
              <div className="d-grid gap-2">
                {cantRegistrar && <button className="btn btn-sm btn-light text-start" onClick={() => setModal({ tipo: "movimiento" })}><i className="bi bi-arrow-left-right me-2 text-primary"></i>Movimiento</button>}
                {cantRegistrar && <button className="btn btn-sm btn-light text-start" onClick={() => setModal({ tipo: "prestamo" })}><i className="bi bi-hand-index me-2 text-primary"></i>Préstamo</button>}
                {cantMant && <button className="btn btn-sm btn-light text-start" onClick={() => setModal({ tipo: "mantenimiento" })}><i className="bi bi-wrench me-2 text-primary"></i>Mantenimiento</button>}
                {can("crear_activos") && <button className="btn btn-sm btn-light text-start" onClick={() => setModal({ tipo: "garantia" })}><i className="bi bi-shield me-2 text-primary"></i>Garantía</button>}
                {cantRegistrar && <button className="btn btn-sm btn-danger-soft text-start" onClick={() => setModal({ tipo: "baja" })}><i className="bi bi-trash me-2"></i>Solicitar baja</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <OperationModal activo={a} modal={modal} onClose={() => setModal(null)} onDone={loadAll} pushToast={pushToast} />
      {anular && <AnularModal mov={anular} onClose={() => setAnular(null)} onDone={loadAll} pushToast={pushToast} />}
      {adjuntando && <UploadModal activo={a} file={adjuntando} onClose={() => setAdjuntando(null)} onDone={() => { setAdjuntando(null); loadAll(); }} pushToast={pushToast} />}
      <ResponsablesModal show={showResp} onClose={() => setShowResp(false)} />
    </div>
  );
}

function F({ label, v }) {
  return (
    <div className="col-6 col-md-4">
      <div className="text-secondary" style={{ fontSize: 11 }}>{label}</div>
      <div className="fw-semibold small text-dark">{v || "—"}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <li className="nav-item">
      <button className={`nav-link fw-semibold ${active ? "active" : ""}`} onClick={onClick}>
        <i className={`bi bi-${icon} me-1`}></i>{label}
      </button>
    </li>
  );
}

function MovsTable({ rows, onAnular }) {
  if (rows.length === 0) return <EmptyState icon="arrow-left-right" title="Sin movimientos" />;
  return (
    <div className="eticos-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr><th>Número</th><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className={m.estado === "ANULADO" ? "text-muted" : ""}>
              <td><span className="fw-semibold">{m.numero}</span></td>
              <td className="small">{fmtDateTime(m.fecha)}</td>
              <td><span className="badge eta-badge" style={{ background: "#e9f2fc", color: "#0b66c2" }}>{m.tipo}</span></td>
              <td className="small text-secondary" style={{ maxWidth: 280 }}>
                {m.observaciones || `${m.responsable_anterior?.nombre || ""} → ${m.responsable_nuevo?.nombre || ""}${m.destino_ubicacion ? " · " + m.destino_ubicacion.nombre : ""}`}
                {m.anulado_motivo && <div className="text-danger">Anulado: {m.anulado_motivo}</div>}
              </td>
              <td><Badge estado={m.estado} /></td>
              <td className="text-end">
                {onAnular && m.estado !== "ANULADO" && (
                  <button className="btn btn-sm btn-light" title="Anular" onClick={() => onAnular(m)}><i className="bi bi-x-circle text-danger"></i></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrestamosTable({ rows, canAprobar, onAprobar, onRechazar, onDevolver }) {
  if (rows.length === 0) return <EmptyState icon="hand-index" title="Sin préstamos" />;
  return (
    <div className="eticos-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr><th>Número</th><th>Préstamo</th><th>Devolución prevista</th><th>Beneficiario</th><th>Cant.</th><th>Seriales</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><span className="fw-semibold">{p.numero}</span></td>
              <td className="small">{fmtDate(p.fecha_prestamo)}</td>
              <td className="small">{fmtDate(p.fecha_prevista_devolucion)}</td>
              <td className="small">{p.responsable?.nombre || p.solicitante?.nombre || "—"}</td>
              <td className="small">{p.cantidad || 1}</td>
              <td className="small">{(p.seriales || []).length ? p.seriales.join(", ") : "—"}</td>
              <td><Badge estado={p.estado} /></td>
              <td className="text-end">
                {p.estado === "SOLICITADO" && canAprobar && (
                  <>
                    <button className="btn btn-sm btn-outline-success me-1" onClick={() => onAprobar(p)}>Aprobar</button>
                    {onRechazar && (
                      <button className="btn btn-sm btn-outline-danger me-1" onClick={() => onRechazar(p)}>Rechazar</button>
                    )}
                  </>
                )}
                {p.estado === "ACTIVO" && onDevolver && (
                  <button className="btn btn-sm btn-outline-primary" onClick={() => onDevolver(p)}>Devolver</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MantsTable({ rows, onCerrar }) {
  if (rows.length === 0) return <EmptyState icon="wrench" title="Sin mantenimientos" />;
  return (
    <div className="eticos-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr><th>Número</th><th>Prog.</th><th>Ejec.</th><th>Tipo</th><th>Cant.</th><th>Seriales</th><th>Estado</th><th>Costo</th><th></th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td><span className="fw-semibold">{m.numero}</span></td>
              <td className="small">{fmtDate(m.fecha_programada)}</td>
              <td className="small">{fmtDate(m.fecha_ejecucion) || "—"}</td>
              <td><span className="badge eta-badge" style={{ background: "#e9f2fc", color: "#0b66c2" }}>{m.tipo}</span></td>
              <td className="small">{m.cantidad || 1}</td>
              <td className="small">{(m.seriales || []).length ? m.seriales.join(", ") : "—"}</td>
              <td><Badge estado={m.estado} /></td>
              <td className="small">{fmtMoney(m.costo)}</td>
              <td className="text-end">
                {onCerrar && m.estado === "PROGRAMADO" && (
                  <button className="btn btn-sm btn-outline-primary" onClick={() => onCerrar({ tipo: "mant_cerrar", item: m })}>Cerrar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GarantiasTable({ rows }) {
  if (rows.length === 0) return <EmptyState icon="shield" title="Sin garantías registradas" />;
  return (
    <div className="eticos-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr><th>Proveedor</th><th>Inicio</th><th>Fin</th><th>Condiciones</th></tr></thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id}>
              <td className="small">{g.proveedor?.nombre || g.fabricante}</td>
              <td className="small">{fmtDate(g.inicio)}</td>
              <td className="small">{fmtDate(g.fin)}</td>
              <td className="small text-secondary">{g.condiciones || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BajasTable({ rows, canAprobar, onAprobar, onRechazar }) {
  if (rows.length === 0) return <EmptyState icon="trash" title="Sin solicitudes de baja" />;
  return (
    <div className="eticos-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr><th>Número</th><th>Solicitud</th><th>Motivo</th><th>Cant.</th><th>Seriales</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><span className="fw-semibold">{b.numero}</span></td>
              <td className="small">{fmtDate(b.fecha_solicitud)}</td>
              <td className="small text-secondary">{b.motivo_tipo}{b.motivo_descripcion ? " · " + b.motivo_descripcion : ""}</td>
              <td className="small">{b.cantidad || 1}</td>
              <td className="small">{(b.seriales || []).length ? b.seriales.join(", ") : "—"}</td>
              <td><Badge estado={b.estado} /></td>
              <td className="text-end">
                {b.estado === "SOLICITADA" && canAprobar && (
                  <>
                    <button className="btn btn-sm btn-outline-success me-1" onClick={() => onAprobar(b)}>Aprobar</button>
                    {onRechazar && (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onRechazar(b)}>Rechazar</button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationModal({ activo, modal, onClose, onDone, pushToast }) {
  if (!modal) return null;
  if (modal.tipo === "movimiento") return <MovimientoForm activo={activo} onDone={onDone} onClose={onClose} pushToast={pushToast} />;
  if (modal.tipo === "prestamo") return <PrestamoForm activo={activo} onDone={onDone} onClose={onClose} pushToast={pushToast} />;
  if (modal.tipo === "mantenimiento") return <MantenimientoForm activo={activo} onDone={onDone} onClose={onClose} pushToast={pushToast} />;
  if (modal.tipo === "mant_cerrar") return <MantCerrarForm mant={modal.item} onDone={onDone} onClose={onClose} pushToast={pushToast} />;
  if (modal.tipo === "garantia") return <GarantiaForm activo={activo} onDone={onDone} onClose={onClose} pushToast={pushToast} />;
  if (modal.tipo === "baja") return <BajaForm activo={activo} onDone={onDone} onClose={onClose} pushToast={pushToast} />;
  return null;
}

function useSelectores() {
  const u = useAsync(() => api.get("/geo/ubicaciones"), []);
  const r = useAsync(() => api.get("/activos/responsables?activo=true"), []);
  return { ubicaciones: u.data || [], responsables: r.data || [], ubicacionesLoading: u.loading, responsablesLoading: r.loading };
}

function MovimientoForm({ activo, onDone, onClose, pushToast }) {
  const [form, setForm] = useState({ tipo: "ASIGNACION", responsable_nuevo_id: "", destino_ubicacion_id: "", motivo: "", observaciones: "" });
  const [busy, setBusy] = useState(false);
  const sel = useSelectores();

  const guardar = async () => {
    setBusy(true);
    try {
      await api.post(`/activos/${activo.id}/movimientos`, {
        tipo: form.tipo,
        destino_ubicacion_id: form.destino_ubicacion_id ? Number(form.destino_ubicacion_id) : null,
        responsable_nuevo_id: form.responsable_nuevo_id ? Number(form.responsable_nuevo_id) : null,
        motivo: form.motivo || null,
        observaciones: form.observaciones || null,
      });
      pushToast("success", "Movimiento registrado");
      onClose();
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title="Registrar movimiento" icon="arrow-left-right" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>{busy ? "Registrando…" : "Registrar"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label small fw-semibold">Tipo *</label>
          <select className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="ASIGNACION">Asignación</option>
            <option value="TRASLADO">Traslado de ubicación</option>
            <option value="DEVOLUCION">Devolución</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </div>
        {(form.tipo === "ASIGNACION" || form.tipo === "DEVOLUCION") && (
          <div className="col-12">
            <label className="form-label small fw-semibold">Responsable nuevo</label>
            <select className="form-select" value={form.responsable_nuevo_id} onChange={(e) => setForm({ ...form, responsable_nuevo_id: e.target.value })} disabled={sel.responsablesLoading}>
              <option value="">Sin cambio de responsable</option>
              {sel.responsables.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </div>
        )}
        {(form.tipo === "TRASLADO" || form.tipo === "AJUSTE") && (
          <div className="col-12">
            <label className="form-label small fw-semibold">Ubicación destino</label>
            <select className="form-select" value={form.destino_ubicacion_id} onChange={(e) => setForm({ ...form, destino_ubicacion_id: e.target.value })} disabled={sel.ubicacionesLoading}>
              <option value="">Sin cambio de ubicación</option>
              {sel.ubicaciones.map((x) => <option key={x.id} value={x.id}>{x.nombre} · {x.sede?.nombre || ""}</option>)}
            </select>
          </div>
        )}
        <div className="col-md-6"><label className="form-label small fw-semibold">Motivo</label><input className="form-control" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Observaciones</label><input className="form-control" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function PrestamoForm({ activo, onDone, onClose, pushToast }) {
  const [form, setForm] = useState({ responsable_id: "", cantidad: 1, seriales: activo?.serial ? [activo.serial] : [], fecha_prestamo: new Date().toISOString().slice(0, 10), fecha_prevista_devolucion: "", motivo: "", observaciones: "" });
  const [busy, setBusy] = useState(false);
  const sel = useSelectores();
  const cantidad = form.seriales.length > 0 ? form.seriales.length : Number(form.cantidad);

  const guardar = async () => {
    setBusy(true);
    try {
      await api.post(`/activos/${activo.id}/prestamos`, {
        responsable_id: form.responsable_id ? Number(form.responsable_id) : null,
        cantidad,
        seriales: form.seriales.length > 0 ? form.seriales : null,
        fecha_prestamo: form.fecha_prestamo ? new Date(form.fecha_prestamo).toISOString() : null,
        fecha_prevista_devolucion: form.fecha_prevista_devolucion ? new Date(form.fecha_prevista_devolucion).toISOString() : null,
        motivo: form.motivo || null,
        observaciones: form.observaciones || null,
      });
      pushToast("success", "Préstamo solicitado");
      onClose();
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title="Solicitar préstamo" icon="hand-index" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>{busy ? "Guardando…" : "Solicitar"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label small fw-semibold">Beneficiario *</label>
          <select className="form-select" value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} disabled={sel.responsablesLoading}>
            <option value="">Seleccionar…</option>
            {sel.responsables.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label small fw-semibold">Seriales del préstamo{activo.serial ? ` (activo: ${activo.serial})` : ""}</label>
          <SerialListInput value={form.seriales} onChange={(seriales) => setForm({ ...form, seriales })} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Cantidad</label>
          {form.seriales.length > 0 ? (
            <div className="form-control">
              <span className="fw-semibold">{cantidad}</span>
              <span className="text-secondary small ms-1">(calculada de los seriales)</span>
            </div>
          ) : (
            <input type="number" min="1" className="form-control" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
          )}
          <small className="text-secondary d-block mt-1">Disponible en stock: {activo.cantidad_stock ?? 0}</small>
        </div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Fecha de préstamo</label><input type="date" className="form-control" value={form.fecha_prestamo} onChange={(e) => setForm({ ...form, fecha_prestamo: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Devolución prevista</label><input type="date" className="form-control" value={form.fecha_prevista_devolucion} onChange={(e) => setForm({ ...form, fecha_prevista_devolucion: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Motivo</label><input className="form-control" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Observaciones</label><input className="form-control" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function MantenimientoForm({ activo, onDone, onClose, pushToast }) {
  const [form, setForm] = useState({ tipo: "PREVENTIVO", cantidad: 1, seriales: activo?.serial ? [activo.serial] : [], fecha_programada: new Date().toISOString().slice(0, 10), diagnostico: "", actividades: "", proposito: "" });
  const [busy, setBusy] = useState(false);
  const cantidad = form.seriales.length > 0 ? form.seriales.length : Number(form.cantidad);

  const guardar = async () => {
    setBusy(true);
    try {
      await api.post(`/activos/${activo.id}/mantenimientos`, {
        tipo: form.tipo,
        cantidad,
        seriales: form.seriales.length > 0 ? form.seriales : null,
        fecha_programada: form.fecha_programada ? new Date(form.fecha_programada).toISOString() : null,
        diagnostico: form.diagnostico || null,
        actividades: form.actividades || null,
        proposito: form.proposito || null,
      });
      pushToast("success", "Mantenimiento programado");
      onClose();
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title="Programar mantenimiento" icon="wrench" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>{busy ? "Guardando…" : "Programar"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Tipo *</label>
          <select className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="PREVENTIVO">Preventivo</option>
            <option value="CORRECTIVO">Correctivo</option>
            <option value="PREDICTIVO">Predictivo</option>
          </select>
        </div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Fecha programada</label><input type="date" className="form-control" value={form.fecha_programada} onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })} /></div>
        <div className="col-12">
          <label className="form-label small fw-semibold">Seriales del equipo{activo.serial ? ` (activo: ${activo.serial})` : ""}</label>
          <SerialListInput value={form.seriales} onChange={(seriales) => setForm({ ...form, seriales })} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Cantidad</label>
          {form.seriales.length > 0 ? (
            <div className="form-control">
              <span className="fw-semibold">{cantidad}</span>
              <span className="text-secondary small ms-1">(calculada de los seriales)</span>
            </div>
          ) : (
            <input type="number" min="1" className="form-control" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
          )}
        </div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Propósito</label><input className="form-control" value={form.proposito} onChange={(e) => setForm({ ...form, proposito: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Diagnóstico</label><input className="form-control" value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} /></div>
        <div className="col-12"><label className="form-label small fw-semibold">Actividades a realizar</label><textarea className="form-control" rows={2} value={form.actividades} onChange={(e) => setForm({ ...form, actividades: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function MantCerrarForm({ mant, onDone, onClose, pushToast }) {
  const [form, setForm] = useState({ resultado: mant.resultado || "", observaciones: "", costo: mant.costo ?? "", proxima_fecha: mant.proxima_fecha ? mant.proxima_fecha.slice(0, 10) : "" });
  const [busy, setBusy] = useState(false);

  const guardar = async () => {
    setBusy(true);
    try {
      await api.put(`/activos/mantenimientos/${mant.id}/cerrar`, {
        resultado: form.resultado || null,
        observaciones: form.observaciones || null,
        costo: form.costo ? Number(form.costo) : null,
        proxima_fecha: form.proxima_fecha ? new Date(form.proxima_fecha).toISOString() : null,
      });
      pushToast("success", "Mantenimiento cerrado");
      onClose();
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title={`Cerrar ${mant.numero}`} icon="check2-circle" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-success" disabled={busy} onClick={guardar}>{busy ? "Guardando…" : "Cerrar mantenimiento"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-12"><label className="form-label small fw-semibold">Resultado *</label><textarea className="form-control" rows={2} value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} placeholder="Trabajo realizado y estado del equipo" /></div>
        <div className="col-md-7"><label className="form-label small fw-semibold">Observaciones</label><input className="form-control" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
        <div className="col-md-5"><label className="form-label small fw-semibold">Costo</label><input type="number" className="form-control" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} /></div>
        <div className="col-12"><label className="form-label small fw-semibold">Próxima fecha</label><input type="date" className="form-control" value={form.proxima_fecha} onChange={(e) => setForm({ ...form, proxima_fecha: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function GarantiaForm({ activo, onDone, onClose, pushToast }) {
  const [form, setForm] = useState({ proveedor_id: "", fabricante: "", inicio: "", fin: "", condiciones: "" });
  const [busy, setBusy] = useState(false);
  const prov = useAsync(() => api.get("/catalogo/proveedores?size=200"), []);

  const guardar = async () => {
    setBusy(true);
    try {
      await api.post(`/activos/${activo.id}/garantias`, {
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        fabricante: form.fabricante || null,
        inicio: form.inicio ? new Date(form.inicio).toISOString() : null,
        fin: form.fin ? new Date(form.fin).toISOString() : null,
        condiciones: form.condiciones || null,
      });
      pushToast("success", "Garantía registrada");
      onClose();
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title="Registrar garantía" icon="shield" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>{busy ? "Guardando…" : "Guardar"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Fabricante</label>
          <input className="form-control" value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Proveedor</label>
          <select className="form-select" value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}>
            <option value="">Sin proveedor</option>
            {(prov.data?.items || prov.data || []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Inicio</label><input type="date" className="form-control" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Fin</label><input type="date" className="form-control" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} /></div>
        <div className="col-12"><label className="form-label small fw-semibold">Condiciones</label><textarea className="form-control" rows={2} value={form.condiciones} onChange={(e) => setForm({ ...form, condiciones: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function BajaForm({ activo, onDone, onClose, pushToast }) {
  const [form, setForm] = useState({ motivo_tipo: "OBSOLETA", cantidad: 1, seriales: activo?.serial ? [activo.serial] : [], motivo_descripcion: "", estado_fisico: "" });
  const [busy, setBusy] = useState(false);
  const cantidad = form.seriales.length > 0 ? form.seriales.length : Number(form.cantidad);

  const guardar = async () => {
    setBusy(true);
    try {
      await api.post(`/activos/${activo.id}/bajas`, {
        motivo_tipo: form.motivo_tipo,
        cantidad,
        seriales: form.seriales.length > 0 ? form.seriales : null,
        motivo_descripcion: form.motivo_descripcion || null,
        estado_fisico: form.estado_fisico || null,
      });
      pushToast("success", "Solicitud de baja registrada");
      onClose();
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open title="Solicitar baja" icon="trash" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-danger" disabled={busy} onClick={guardar}>{busy ? "Guardando…" : "Solicitar baja"}</button>
        </>
      }>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label small fw-semibold">Motivo *</label>
          <select className="form-select" value={form.motivo_tipo} onChange={(e) => setForm({ ...form, motivo_tipo: e.target.value })}>
            <option value="OBSOLETA">Tecnología obsoleta</option>
            <option value="DANADA">Daño irreparable</option>
            <option value="VENTA">Venta</option>
            <option value="DONACION">Donación</option>
            <option value="PERDIDA">Pérdida / hurto</option>
          </select>
        </div>
        <div className="col-12"><label className="form-label small fw-semibold">Descripción</label><textarea className="form-control" rows={2} value={form.motivo_descripcion} onChange={(e) => setForm({ ...form, motivo_descripcion: e.target.value })} /></div>
        <div className="col-12">
          <label className="form-label small fw-semibold">Seriales del equipo{activo.serial ? ` (activo: ${activo.serial})` : ""}</label>
          <SerialListInput value={form.seriales} onChange={(seriales) => setForm({ ...form, seriales })} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Cantidad</label>
          {form.seriales.length > 0 ? (
            <div className="form-control">
              <span className="fw-semibold">{cantidad}</span>
              <span className="text-secondary small ms-1">(calculada de los seriales)</span>
            </div>
          ) : (
            <input type="number" min="1" className="form-control" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
          )}
        </div>
        <div className="col-12"><label className="form-label small fw-semibold">Estado físico</label><input className="form-control" value={form.estado_fisico} onChange={(e) => setForm({ ...form, estado_fisico: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function AnularModal({ mov, onClose, onDone, pushToast }) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmModal open title="Anular movimiento" confirmLabel="Anular" confirmClass="btn-danger" busy={busy}
      onClose={onClose}
      onConfirm={async () => {
        if (!motivo.trim()) { pushToast("error", "Debes indicar el motivo"); return; }
        setBusy(true);
        try {
          await api.put(`/activos/movimientos/${mov.id}/anular`, { motivo });
          pushToast("success", "Movimiento anulado");
          onClose();
          onDone();
        } catch (e) { pushToast("error", e.message); setBusy(false); }
      }}>
      <div className="small text-secondary mb-2">Vas a anular <b>{mov.numero}</b> ({mov.tipo}). Esta acción es irreversible.</div>
      <label className="form-label small fw-semibold">Motivo de la anulación *</label>
      <textarea className="form-control" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: registro incorrecto" />
    </ConfirmModal>
  );
}

function UploadModal({ activo, file, onClose, onDone, pushToast }) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    setBusy(true);
    try {
      await api.upload(`/archivos/${activo.id}`, file, {}, (p) => setProgress(p));
      pushToast("success", "Archivo adjuntado");
      onDone();
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
    }
  };
  return (
    <Modal open title="Adjuntar archivo" icon="paperclip" onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={upload}>{busy ? "Subiendo…" : "Subir"}</button>
        </>
      }>
      <div className="text-center py-2">
        <i className="bi bi-file-earmark-arrow-up fs-1 text-primary"></i>
        <div className="fw-semibold mt-2">{file.name}</div>
        <div className="text-secondary small">{(file.size / 1024).toFixed(1)} KB · se vinculará al activo {activo.codigo}</div>
        {busy && (
          <div className="progress mt-3">
            <div className="progress-bar" style={{ width: `${progress}%`, background: "var(--eticos-brand)" }}>{progress}%</div>
          </div>
        )}
      </div>
    </Modal>
  );
}