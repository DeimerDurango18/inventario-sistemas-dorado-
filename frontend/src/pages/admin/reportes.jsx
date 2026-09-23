import { useState } from "react";
import api, { downloadFile } from "../../api/client";
import { Card, PageHeader } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const REPORTES = [
  { key: "activos", icon: "pc-display", titulo: "Inventario de activos", desc: "Listado completo con código, serial, ubicación, responsable y valor.", color: "#0b66c2" },
  { key: "stock", icon: "boxes", titulo: "Existencias", desc: "Stock por ítem, activos en bodega y movimientos de entradas/salidas.", color: "#2f8fe0" },
  { key: "movimientos", icon: "arrow-left-right", titulo: "Movimientos", desc: "Historial de asignaciones, traslados y devoluciones.", color: "#0dcaf0" },
  { key: "mantenimientos", icon: "wrench-adjustable", titulo: "Mantenimientos", desc: "Programados, ejecutados, costos y repuestos.", color: "#28a745" },
  { key: "garantias", icon: "shield-check", titulo: "Garantías", desc: "Vigentes, por vencer y vencidas por activo.", color: "#fd7e14" },
  { key: "tickets", icon: "headset", titulo: "Tickets de soporte", desc: "Incidentes abiertos y resueltos por prioridad.", color: "#dc3545" },
  { key: "bajas", icon: "archive", titulo: "Bajas", desc: "Solicitudes y bajas aprobadas con motivo.", color: "#6c757d" },
];

export default function Reportes() {
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(null);

  const exportar = async (r) => {
    setBusy(r.key);
    try {
      const name = await downloadFile(`/reportes/${r.key}.xlsx`, `reporte_${r.key}.xlsx`);
      pushToast("success", `Reporte ${name || r.titulo} descargado`);
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Exporta la información del sistema a Excel con un clic"
        icon="file-earmark-bar-graph"
      />

      <div className="row g-3">
        {REPORTES.map((r) => (
          <div key={r.key} className="col-md-6 col-xl-4">
            <Card title={r.titulo} icon={r.icon} bodyClassName="p-3">
              <p className="text-secondary small mb-3">{r.desc}</p>
              <button className="btn btn-sm btn-brand w-100" disabled={busy === r.key} onClick={() => exportar(r)}>
                {busy === r.key ? (
                  <><span className="spinner-border spinner-border-sm me-2" /> Generando…</>
                ) : (
                  <><i className="bi bi-file-earmark-excel me-2" /> Exportar Excel</>
                )}
              </button>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}