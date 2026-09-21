import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { qrUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import ResponsablesModal from "./ResponsablesModal";

function Field({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-secondary" style={{ fontSize: 12 }}>{label}</div>
      <div className="fw-semibold">{value || "â€”"}</div>
    </div>
  );
}

function MovimientoForm({ activoId, onDone }) {
  const [form, setForm] = useState({ tipo: "ASIGNACION", responsable_nuevo_id: "", destino_ubicacion_id: "", observaciones: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/activos/${activoId}/movimientos`, {
        tipo: form.tipo,
        responsable_nuevo_id: form.responsable_nuevo_id || null,
        destino_ubicacion_id: form.destino_ubicacion_id || null,
        observaciones: form.observaciones || null,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="row g-2">
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="ASIGNACION">AsignaciÃ³n</option>
            <option value="TRASLADO">Traslado</option>
            <option value="DEVOLUCION">DevoluciÃ³n</option>
            <option value="PRESTAMO">PrÃ©stamo</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
          </select>
        </div>
        <div className="col-md-3">
          <input className="form-control form-control-sm" placeholder="Responsable nuevo (id)" value={form.responsable_nuevo_id} onChange={(e) => setForm({ ...form, responsable_nuevo_id: e.target.value })} />
        </div>
        <div className="col-md-3">
          <input className="form-control form-control-sm" placeholder="UbicaciÃ³n destino (id)" value={form.destino_ubicacion_id} onChange={(e) => setForm({ ...form, destino_ubicacion_id: e.target.value })} />
        </div>
        <div className="col-md-3 d-flex gap-2">
          <input className="form-control form-control-sm" placeholder="Observaciones" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          <button className="btn btn-sm text-white" style={{ background: "var(--eticos-primary)" }} disabled={busy}>Registrar</button>
        </div>
      </div>
      {error && <div className="text-danger small mt-2">{error}</div>}
    </form>
  );
}

export default function ActivoDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [a, setA] = useState(null);
  const [movs, setMovs] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [mants, setMants] = useState([]);
  const [garantias, setGarantias] = useState([]);
  const [tab, setTab] = useState("historial");
  const [showResp, setShowResp] = useState(false);

  const load = () => {
    api.get(`/activos/${id}`).then(({ data }) => setA(data)).catch(() => {});
    api.get(`/activos/${id}/movimientos`).then(({ data }) => setMovs(data)).catch(() => {});
    api.get(`/activos/${id}/prestamos`).then(({ data }) => setPrestamos(data)).catch(() => {});
    api.get(`/activos/${id}/mantenimientos`).then(({ data }) => setMants(data)).catch(() => {});
    api.get(`/activos/${id}/garantias`).then(({ data }) => setGarantias(data)).catch(() => {});
  };

  useEffect(load, [id]);

  if (!a) return <div className="text-center mt-5">Cargandoâ€¦</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Link to="/activos" className="text-decoration-none text-secondary me-2"><i className="bi bi-arrow-left"></i></Link>
          <h5 className="d-inline">{a.codigo}</h5>
          <span className="badge rounded-pill ms-2" style={{ background: a.estado?.color || "#6c757d" }}>{a.estado?.nombre}</span>
        </div>
        {can("editar_activos") && (
          <Link to={`/activos/${a.id}/editar`} className="btn btn-sm btn-outline-secondary"><i className="bi bi-pencil me-1"></i>Editar</Link>
        )}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card stat-card mb-3">
            <div className="card-body">
              <div className="row">
                <div className="col-6 col-md-4"><Field label="Tipo" value={a.tipo} /></div>
                <div className="col-6 col-md-4"><Field label="Serial" value={a.serial} /></div>
                <div className="col-6 col-md-4"><Field label="CÃ³digo inventario" value={a.codigo_inventario} /></div>
                <div className="col-6 col-md-4"><Field label="CategorÃ­a" value={a.categoria?.nombre} /></div>
                <div className="col-6 col-md-4"><Field label="Marca / Modelo" value={a.marca?.nombre + (a.modelo ? " / " + a.modelo.nombre : "")} /></div>
                <div className="col-6 col-md-4"><Field label="Placa" value={a.placa} /></div>
                <div className="col-6 col-md-4"><Field label="Sede" value={a.ubicacion?.sede?.nombre} /></div>
                <div className="col-6 col-md-4"><Field label="UbicaciÃ³n" value={a.ubicacion?.nombre} /></div>
                <div className="col-6 col-md-4"><Field label="Responsable" value={a.responsable?.nombre} /></div>
                <div className="col-6 col-md-4"><Field label="Valor adquisiciÃ³n" value={a.valor_adquisicion && "$ " + Number(a.valor_adquisicion).toLocaleString()} /></div>
                <div className="col-6 col-md-4"><Field label="Factura" value={a.factura_numero} /></div>
                <div className="col-6 col-md-4"><Field label="Fecha adquisiciÃ³n" value={a.fecha_adquisicion?.slice(0, 10)} /></div>
                <div className="col-6 col-md-4"><Field label="GarantÃ­a fin" value={a.fecha_fin_garantia?.slice(0, 10)} /></div>
                <div className="col-6 col-md-4"><Field label="Proveedor" value={a.proveedor?.nombre} /></div>
              </div>
              {a.observaciones && <div className="mt-2 small text-secondary">Notas: {a.observaciones}</div>}
            </div>
          </div>

          <div className="card stat-card">
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item"><button className={`nav-link ${tab === "historial" ? "active" : ""}`} onClick={() => setTab("historial")}>Historial ({movs.length})</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === "prestamos" ? "active" : ""}`} onClick={() => setTab("prestamos")}>PrÃ©stamos ({prestamos.length})</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === "mant" ? "active" : ""}`} onClick={() => setTab("mant")}>Mantenimientos ({mants.length})</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === "garantia" ? "active" : ""}`} onClick={() => setTab("garantia")}>GarantÃ­as ({garantias.length})</button></li>
              </ul>
            </div>
            <div className="card-body">
              {tab === "historial" && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light"><tr><th>NÃºmero</th><th>Fecha</th><th>Tipo</th><th>Detalle</th></tr></thead>
                    <tbody>
                      {movs.length === 0 && <tr><td colSpan={4} className="text-center text-secondary py-3">Sin movimientos</td></tr>}
                      {movs.map((m) => (
                        <tr key={m.id}>
                          <td>{m.numero}</td>
                          <td>{m.fecha?.slice(0, 10)}</td>
                          <td>{m.tipo}</td>
                          <td className="small">{m.observaciones || `${m.responsable_anterior?.nombre || ""} â†’ ${m.responsable_nuevo?.nombre || ""}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tab === "prestamos" && PrestamosTable({ items: prestamos })}
              {tab === "mant" && MantsTable({ items: mants })}
              {tab === "garantia" && GarantiasTable({ items: garantias })}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card stat-card mb-3">
            <div className="card-body text-center">
              <div className="text-secondary mb-1" style={{ fontSize: 12 }}>CÃ³digo QR</div>
              <img src={qrUrl(a.id)} alt="QR" width={150} height={150} className="border rounded" />
              <div className="mt-2"><Link to={qrUrl(a.id)} target="_blank" download={`${a.codigo}.png`} className="btn btn-sm btn-outline-primary"><i className="bi bi-download me-1"></i>Descargar</Link></div>
            </div>
          </div>

          {can("registrar_movimientos") && (
            <div className="card stat-card mb-3">
              <div className="card-header bg-white fw-semibold">Registrar movimiento</div>
              <div className="card-body">
                <MovimientoForm activoId={a.id} onDone={load} />
                <div className="mt-2 d-flex flex-column gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowResp(true)}><i className="bi bi-person-plus me-1"></i>Gestionar responsables</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ResponsablesModal show={showResp} onClose={() => setShowResp(false)} />
    </div>
  );
}

function PrestamosTable({ items }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0">
        <thead className="table-light"><tr><th>NÃºmero</th><th>Fecha prÃ©stamo</th><th>DevoluciÃ³n prevista</th><th>Responsable</th><th>Estado</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5} className="text-center text-secondary py-3">Sin prÃ©stamos</td></tr>}
          {items.map((p) => (
            <tr key={p.id}><td>{p.numero}</td><td>{p.fecha_prestamo?.slice(0, 10)}</td><td>{p.fecha_prevista_devolucion?.slice(0, 10)}</td><td>{p.responsable?.nombre || p.solicitante?.nombre}</td><td>{p.estado}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MantsTable({ items }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0">
        <thead className="table-light"><tr><th>NÃºmero</th><th>Fecha programada</th><th>Tipo</th><th>Estado</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={4} className="text-center text-secondary py-3">Sin mantenimientos</td></tr>}
          {items.map((m) => (
            <tr key={m.id}><td>{m.numero}</td><td>{m.fecha_programada?.slice(0, 10)}</td><td>{m.tipo}</td><td>{m.estado}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GarantiasTable({ items }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0">
        <thead className="table-light"><tr><th>Proveedor</th><th>Inicio</th><th>Fin</th><th>Condiciones</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={4} className="text-center text-secondary py-3">Sin garantÃ­as</td></tr>}
          {items.map((g) => (
            <tr key={g.id}><td>{g.proveedor?.nombre || g.fabricante}</td><td>{g.inicio?.slice(0, 10)}</td><td>{g.fin?.slice(0, 10)}</td><td>{g.condiciones || "â€”"}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}