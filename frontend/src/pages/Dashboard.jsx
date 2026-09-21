import { useEffect, useState } from "react";
import api from "../api/client";

const ESTADO_COLORES = {
  Disponible: "#28a745",
  "En uso": "#007bff",
  "En bodega": "#6c757d",
  "En prÃ©stamo": "#fd7e14",
  "En mantenimiento": "#dc3545",
  "Dado de baja": "#343a40",
};

function StatCard({ icon, color, value, label }) {
  return (
    <div className="card stat-card">
      <div className="card-body d-flex align-items-center gap-3 p-3">
        <div className="rounded d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: `${color}18`, color }}>
          <i className={`bi bi-${icon} fs-4`}></i>
        </div>
        <div>
          <div className="fs-4 fw-bold lh-1">{value}</div>
          <div className="text-secondary" style={{ fontSize: 12.5 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [porSede, setPorSede] = useState([]);
  const [porCategoria, setPorCategoria] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard/kpis")
      .then(({ data }) => setKpis(data))
      .catch((e) => setError(e.message));
    api.get("/dashboard/por-sede").then(({ data }) => setPorSede(data)).catch(() => {});
    api.get("/dashboard/por-categoria").then(({ data }) => setPorCategoria(data)).catch(() => {});
    api.get("/dashboard/alertas").then(({ data }) => setAlertas(data)).catch(() => {});
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!kpis) return <div className="text-center mt-5">Cargando indicadoresâ€¦</div>;

  const maxSede = Math.max(1, ...porSede.map((s) => s.cantidad));
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.cantidad));
  const maxEstado = Math.max(1, ...Object.values(kpis.por_estado));

  return (
    <div>
      <div className="row g-3">
        <div className="col-6 col-md-4 col-xl-2"><StatCard icon="hdd-stack" color="#007bff" value={kpis.total_activos} label="Total activos" /></div>
        <div className="col-6 col-md-4 col-xl-2"><StatCard icon="check-circle" color="#28a745" value={kpis.activos_activos} label="Activos vigentes" /></div>
        <div className="col-6 col-md-4 col-xl-2"><StatCard icon="shield-check" color="#fd7e14" value={kpis.garantias_proximas} label="GarantÃ­as 60 dÃ­as" /></div>
        <div className="col-6 col-md-4 col-xl-2"><StatCard icon="shield-x" color="#dc3545" value={kpis.garantias_vencidas} label="GarantÃ­as vencidas" /></div>
        <div className="col-6 col-md-4 col-xl-2"><StatCard icon="wrench" color="#6f42c1" value={kpis.mantenimientos_programados} label="Mant. programados" /></div>
        <div className="col-6 col-md-4 col-xl-2"><StatCard icon="arrow-left-right" color="var(--eticos-primary)" value={kpis.movimientos_mes} label="Movimientos del mes" /></div>
      </div>

      <div className="row g-3 mt-2">
        <div className="col-12 col-lg-4">
          <div className="card stat-card h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">Estado de equipos</h6>
              {Object.entries(kpis.por_estado).map(([nombre, cantidad]) => (
                <div key={nombre} className="mb-2">
                  <div className="d-flex justify-content-between small">
                    <span>{nombre}</span>
                    <span className="fw-semibold">{cantidad}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className="progress-bar" style={{ width: `${(cantidad / maxEstado) * 100}%`, background: ESTADO_COLORES[nombre] || "#6c757d" }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card stat-card h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">Activos por sede</h6>
              {porSede.length === 0 && <div className="text-secondary small">Sin registros.</div>}
              {porSede.map((s) => (
                <div key={s.sede} className="mb-2">
                  <div className="d-flex justify-content-between small">
                    <span className="text-truncate">{s.sede}</span>
                    <span className="fw-semibold">{s.cantidad}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className="progress-bar bg-info" style={{ width: `${(s.cantidad / maxSede) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card stat-card h-100">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">CategorÃ­as</h6>
              {porCategoria.length === 0 && <div className="text-secondary small">Sin registros.</div>}
              {porCategoria.map((c) => (
                <div key={c.nombre} className="mb-2">
                  <div className="d-flex justify-content-between small">
                    <span>{c.nombre}</span>
                    <span className="fw-semibold">{c.cantidad}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className="progress-bar bg-warning" style={{ width: `${(c.cantidad / maxCat) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="mt-3">
          <h6 className="fw-semibold"><i className="bi bi-bell me-1"></i>Alertas</h6>
          <div className="d-flex flex-column gap-2">
            {alertas.map((a, i) => (
              <div key={i} className="alert alert-warning py-2 mb-0">
                <strong>{a.titulo}:</strong> {a.mensaje}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}