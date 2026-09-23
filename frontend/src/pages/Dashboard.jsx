import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";
import api from "../api/client";
import { Badge, Card, EmptyState, LoadingBlock, StatCard } from "../components/ui";
import useAsync from "../hooks/useAsync";

const PALETTE = ["#0b66c2", "#3ba2f5", "#17b26a", "#f79009", "#eb3f5b", "#2f8fe0", "#0ba5ec", "#8b5cf6", "#06a6c9", "#3f4f7a"];

const lighten = (hex, amt = 0.6) => {
  const n = parseInt(hex.replace("#", ""), 16) || 0;
  const mix = (c) => Math.round(c + (255 - c) * amt);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

function PieDona({ uid, data, height = 230, centerLabel, centerSub, emptyIcon, emptyTitle }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  const active = activeIdx >= 0 && activeIdx < data.length ? data[activeIdx] : null;

  const renderActiveSector = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={8}
        fill={fill}
      />
    );
  };

  if (data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} />;
  }

  return (
    <>
      <div className="lfo-donut-wrap">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <defs>
              {data.map((d, i) => (
                <linearGradient key={d.name} id={`pg-${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={lighten(d.color)} />
                  <stop offset="100%" stopColor={d.color} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={Math.round(height * 0.27)}
              outerRadius={Math.round(height * 0.41)}
              paddingAngle={3}
              cornerRadius={8}
              stroke="#fff"
              strokeWidth={3}
              activeIndex={activeIdx >= 0 ? activeIdx : undefined}
              activeShape={renderActiveSector}
              onMouseEnter={(_, i) => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={`url(#pg-${uid}-${i})`} style={{ cursor: "pointer", outline: "none" }} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #eef1f8", boxShadow: "0 0.4rem 1.2rem rgba(37,53,97,.12)", fontSize: 13 }}
              itemStyle={{ color: "#1c2340" }}
              formatter={(value, name) => [`${value} · ${pct(value)}%`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="lfo-donut-center">
          {active ? (
            <>
              <b>{active.value}</b>
              <span>{active.name}</span>
              <small className="lfo-donut-pct">{pct(active.value)}% del total</small>
            </>
          ) : (
            <>
              <b>{total}</b>
              <span>{centerLabel}</span>
              <small className="lfo-donut-pct">{centerSub}</small>
            </>
          )}
        </div>
      </div>
      <div className="lfo-legend mt-3">
        {data.map((d, i) => (
          <div
            key={d.name}
            className={`lfo-legend-row${activeIdx === i ? " active" : ""}`}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(-1)}
          >
            <span className="lfo-dot" style={{ background: d.color }}></span>
            <span className="lfo-name">{d.name}</span>
            <span className="lfo-num">{d.value}</span>
            <span className="lfo-pct">{pct(d.value)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Dashboard() {
  const [estados, setEstados] = useState([]);
  const [extra, setExtra] = useState({ tickets_abiertos: 0 });
  const [stock, setStock] = useState(null);
  const all = useAsync(async () => {
    const [kpis, porCat, porSede, alertas] = await Promise.all([
      api.get("/dashboard/kpis"),
      api.get("/dashboard/por-categoria"),
      api.get("/dashboard/por-sede"),
      api.get("/dashboard/alertas"),
    ]);
    return { kpis: kpis.data, porCat: porCat.data || [], porSede: porSede.data || [], alertas: alertas.data || [] };
  }, []);

  useEffect(() => {
    api.get("/catalogo/estados").then((r) => setEstados(r.data || [])).catch(() => {});
    api.get("/dashboard/bajas-tickets").then((r) => setExtra(r.data || {})).catch(() => {});
    api.get("/stock/resumen").then((r) => setStock(r.data || null)).catch(() => setStock(null));
  }, []);

  const { data, loading } = all;
  if (loading || !data) return <LoadingBlock label="Cargando indicadores…" />;
  const { kpis, porCat, porSede, alertas } = data;

  const colorOf = (nombre) => {
    const e = estados.find((s) => s.nombre === nombre);
    return e?.color || "#8b95ad";
  };

  const total = kpis.total_activos;
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);

  const estadoData = Object.entries(kpis.por_estado || {})
    .map(([name, value]) => ({ name, value, color: colorOf(name) }))
    .sort((a, b) => b.value - a.value);
  const catData = porCat.map((c, i) => ({ name: c.nombre, value: c.cantidad, color: PALETTE[i % PALETTE.length] }));
  const sedeData = porSede.map((s, i) => ({ name: s.sede, value: s.cantidad, color: PALETTE[i % PALETTE.length] }));

  const kpiCfg = [
    { icon: "database", color: "#0b66c2", chip: "#e9f2fc", value: total, label: "Activos registrados", sub: "Total en el sistema" },
    { icon: "boxes", color: "#2f8fe0", chip: "#e8f1fc", value: stock?.unidades_totales ?? 0, label: "Unidades en stock", sub: "Bodega y existencias" },
    { icon: "check-circle", color: "#17b26a", chip: "#e6f6ec", value: kpis.activos_activos, label: "Activos operativos", sub: `${pct(kpis.activos_activos)}% del total` },
    { icon: "box-seam", color: "#f79009", chip: "#fff2e3", value: kpis.prestamos_activos, label: "Préstamos activos", sub: "Solicitados + en uso" },
    { icon: "wrench-adjustable", color: "#2f8fe0", chip: "#e8f1fc", value: kpis.mantenimientos_programados, label: "Mantenimientos abiertos", sub: "Programados y en curso" },
    { icon: "shield-check", color: "#0ba5ec", chip: "#e3f6fb", value: kpis.garantias_proximas, label: "Garantías próximas", sub: "Vencen en 60 días" },
    { icon: "shield-x", color: "#eb3f5b", chip: "#fdeeee", value: kpis.garantias_vencidas, label: "Garantías vencidas", sub: "Requieren atención" },
  ];

  return (
    <div>
      <div className="row g-3 mb-3">
        {kpiCfg.map((k) => (
          <div key={k.label} className="col-6 col-md-4 col-xl-2">
            <StatCard icon={k.icon} color={k.color} chip={k.chip} value={k.value} label={k.label} sub={k.sub} />
          </div>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <Card title="Estructura del inventario" icon="pie-chart" className="lfo-card" bodyClassName="p-3">
            <PieDona uid="estad" data={estadoData} centerLabel="Activos" centerSub={`${estadoData.length} estados`} emptyIcon="hdd" emptyTitle="Sin activos por estado" />
          </Card>
        </div>
        <div className="col-lg-4">
          <Card title="Activos por categoría" icon="pie-chart" className="lfo-card" bodyClassName="p-3">
            <PieDona uid="cat" data={catData} centerLabel="Activos" centerSub={`${catData.length} categorías`} emptyIcon="tag" emptyTitle="Sin datos por categoría" />
          </Card>
        </div>
        <div className="col-lg-4">
          <Card title="Activos por sede" icon="pie-chart" className="lfo-card" bodyClassName="p-3">
            <PieDona uid="sede" data={sedeData} centerLabel="Activos" centerSub={`${sedeData.length} sedes`} emptyIcon="building" emptyTitle="Sin activos por sede" />
          </Card>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7 col-xl-8">
          <Card title="Alertas · Garantías próximas" icon="bell" className="lfo-card" bodyClassName="p-3">
            {alertas.length === 0 ? (
              <EmptyState icon="shield-shaded" title="Sin alertas" hint="Garantías a vencer en 60 días aparecerán aquí" />
            ) : (
              <div className="d-flex flex-column gap-2">
                {alertas.map((a, i) => (
                  <div key={i} className="lfo-alert">
                    <div className="lfo-chip" style={{ background: "#fff2e3", color: "#f79009", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-shield-exclamation"></i>
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="small fw-semibold" style={{ color: "#1c2340" }}>{a.titulo}</div>
                      <small className="d-block text-truncate" style={{ color: "#6b7793" }}>{a.mensaje}</small>
                    </div>
                    <small className="fw-semibold" style={{ color: "#f79009" }}>Alerta</small>
                  </div>
                ))}
                <Link className="btn btn-sm btn-soft mt-1" to="/activos">
                  Ver activos <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            )}
          </Card>
        </div>

        <div className="col-lg-5 col-xl-4">
          <Card title="Indicadores rápidos" icon="speedometer2" className="lfo-card">
            <div className="lfo-stat-line">
              <span className="lfo-key">Movimientos del mes</span>
              <span className="lfo-val">{kpis.movimientos_mes}</span>
            </div>
            <div className="lfo-stat-line">
              <span className="lfo-key">Bajas solicitadas</span>
              <span className="lfo-val">{kpis.bajas_solicitadas}</span>
            </div>
            <div className="lfo-stat-line">
              <span className="lfo-key">Tickets abiertos</span>
              <span className="lfo-val">{extra.tickets_abiertos ?? 0}</span>
            </div>
            <div className="lfo-stat-line">
              <span className="lfo-key">Estado del sistema</span>
              <Badge estado={{ label: "En línea", cls: "success" }} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}