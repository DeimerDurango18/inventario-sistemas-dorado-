import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { fmtDate } from "../utils/format";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [qrCodigo, setQrCodigo] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [qrError, setQrError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  const consultarQr = async (e) => {
    e.preventDefault();
    if (!qrCodigo.trim()) return;
    setQrBusy(true);
    setQrError("");
    setQrResult(null);
    try {
      const { data } = await api.get(`/activos/consulta-publica/${qrCodigo.trim()}`);
      setQrResult(data);
    } catch (err) {
      setQrError(err?.message || "No se pudo consultar el código.");
    } finally {
      setQrBusy(false);
    }
  };

  return (
    <div className="eticos-login-wrap">
      <div className="eticos-login-brand">
        <div className="d-flex align-items-center gap-3">
          <div className="brand-logo">
            <i className="bi bi-hdd-network-fill"></i>
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: 20 }}>ETICOS</div>
            <small className="text-white-50">Gestión de Activos TI</small>
          </div>
        </div>

        <div style={{ maxWidth: 460 }}>
          <h1 className="fw-bold mb-3" style={{ fontSize: 30 }}>
            Control total de tu inventario tecnológico
          </h1>
          <p className="text-white-50 mb-4">
            Registra, moviliza y da mantenimiento a tus equipos en un solo lugar: código QR,
            actas, préstamos, garantías y reportes.
          </p>
          <div className="d-flex flex-column gap-3">
            <div className="feature d-flex gap-3 align-items-center">
              <i className="bi bi-check-lg fs-4"></i>
              <div>
                <div className="fw-semibold">Trazabilidad completa</div>
                <small className="text-white-50">Cada movimiento deja acta y queda auditado.</small>
              </div>
            </div>
            <div className="feature d-flex gap-3 align-items-center">
              <i className="bi bi-check-lg fs-4"></i>
              <div>
                <div className="fw-semibold">Identificación por código QR</div>
                <small className="text-white-50">Consulta pública del estado de cada equipo.</small>
              </div>
            </div>
            <div className="feature d-flex gap-3 align-items-center">
              <i className="bi bi-check-lg fs-4"></i>
              <div>
                <div className="fw-semibold">Alertas y reportes</div>
                <small className="text-white-50">Garantías por vencer, mantenimientos y más.</small>
              </div>
            </div>
          </div>
        </div>

        <small className="text-white-50">© {new Date().getFullYear()} ETICOS · Sistemas Bogotá</small>
      </div>

      <div className="eticos-login-form">
        <div className="eticos-login-card">
          <div className="card eticos-card border-0" style={{ boxShadow: "0 1rem 3rem rgba(67,89,113,.25)" }}>
            <div className="card-body p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="et-avatar mx-auto mb-3" style={{ width: 56, height: 56, fontSize: 20 }}>
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <h4 className="fw-bold mb-1">Bienvenido de nuevo</h4>
                <small className="text-secondary">Inicia sesión para gestionar tus activos</small>
              </div>

              {error && (
                <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-octagon-fill"></i> {error}
                </div>
              )}

              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Usuario</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-person"></i></span>
                    <input
                      className="form-control"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-semibold">Contraseña</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-lock"></i></span>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button className="btn btn-brand w-100 py-2 fw-semibold" disabled={busy}>
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" /> Ingresando…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2" /> Ingresar
                    </>
                  )}
                </button>
              </form>

              <div className="d-flex align-items-center gap-2 my-4">
                <hr className="flex-grow-1" />
                <small className="text-secondary lh-1"><i className="bi bi-qr-code me-1"></i> Consulta pública de equipos</small>
                <hr className="flex-grow-1" />
              </div>

              <form onSubmit={consultarQr}>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-qr-code-scan"></i></span>
                  <input
                    className="form-control"
                    placeholder="Código QR del equipo"
                    value={qrCodigo}
                    onChange={(e) => { setQrCodigo(e.target.value); setQrResult(null); setQrError(""); }}
                  />
                  <button className="btn btn-soft fw-semibold" disabled={qrBusy}>
                    {qrBusy ? <span className="spinner-border spinner-border-sm" /> : "Consultar"}
                  </button>
                </div>

                {qrError && <div className="text-danger small mt-2"><i className="bi bi-exclamation-circle me-1"></i>{qrError}</div>}

                {qrResult && (
                  <div className="mt-3 p-3 rounded-3 border bg-white eticos-card">
                    {qrResult.existente ? (
                      <>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-bold">{qrResult.codigo}</span>
                          {qrResult.estado_color && <span className="badge eta-badge" style={{ background: qrResult.estado_color || "#64748b" }}>{qrResult.estado}</span>}
                        </div>
                        <dl className="row small mb-0">
                          {qrResult.tipo && <><dt className="col-4 text-secondary mb-1">Tipo</dt><dd className="col-8 mb-1">{qrResult.tipo}</dd></>}
                          {qrResult.marca && <><dt className="col-4 text-secondary mb-1">Marca</dt><dd className="col-8 mb-1">{qrResult.marca}</dd></>}
                          {qrResult.modelo && <><dt className="col-4 text-secondary mb-1">Modelo</dt><dd className="col-8 mb-1">{qrResult.modelo}</dd></>}
                          {qrResult.serial && <><dt className="col-4 text-secondary mb-1">Serial</dt><dd className="col-8 mb-1">{qrResult.serial}</dd></>}
                          {qrResult.sede && <><dt className="col-4 text-secondary mb-1">Sede</dt><dd className="col-8 mb-1">{qrResult.sede}</dd></>}
                          {qrResult.ubicacion && <><dt className="col-4 text-secondary mb-1">Ubicación</dt><dd className="col-8 mb-1">{qrResult.ubicacion}</dd></>}
                          {qrResult.responsable && <><dt className="col-4 text-secondary mb-1">Responsable</dt><dd className="col-8 mb-1">{qrResult.responsable}</dd></>}
                          {qrResult.fecha_fin_garantia && <><dt className="col-4 text-secondary mb-1">Garantía hasta</dt><dd className="col-8 mb-1">{fmtDate(qrResult.fecha_fin_garantia)}</dd></>}
                          {qrResult.observaciones && <><dt className="col-4 text-secondary mb-1">Notas</dt><dd className="col-8 mb-1">{qrResult.observaciones}</dd></>}
                          {!qrResult.estado_color && <><dt className="col-4 text-secondary mb-1">Estado</dt><dd className="col-8 mb-1">{qrResult.estado}</dd></>}
                        </dl>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <i className="bi bi-search text-secondary d-block mb-1" style={{ fontSize: 22 }}></i>
                        <span className="small fw-semibold">No se encontró un equipo con el código "{qrResult.codigo}".</span>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}