import { useMemo, useState } from "react";
import api from "../../api/client";
import { Card, EmptyState, LoadingBlock, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../context/ToastContext";

const DEFAULT_EMPRESA = {
  empresa_nombre: "SISTEMAS BOGOTÁ",
  empresa_comercial: "ETICOS BOGOTÁ",
  empresa_nit: "892300678-7",
  empresa_telefono: "601 587 3010",
  empresa_direccion: "AUTOPISTA MEDELLÍN KM 3.5 COSTADO NORTE CENTRO EMPRESARIAL METROPOLITANO",
  empresa_ciudad: "BOGOTÁ",
  encargado_nombre: "EDILFER AGUIRRE",
  encargado_cargo: "DESPACHO BODEGA",
  destino_nombre: "BODEGA BOGOTÁ",
};

export default function Configuracion() {
  const { pushToast } = useToast();
  const loader = useMemo(() => api.get("/parametros"), []);
  const { data, loading, reload } = useAsync(() => loader, []);
  const [editing, setEditing] = useState({});
  const [busy, setBusy] = useState({});

  const params = Array.isArray(data) ? data : [];
  const groups = params.reduce((acc, p) => {
    (acc[p.grupo || "General"] ??= []).push(p);
    return acc;
  }, {});
  const defaultPresent = params.some((p) => p.clave === "empresa_nombre");

  const save = async (p) => {
    setBusy((b) => ({ ...b, [p.clave]: true }));
    try {
      await api.put(`/parametros/${p.clave}`, { valor: editing[p.clave] ?? p.valor ?? "" });
      pushToast("success", `Parámetro ${p.clave} actualizado`);
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy((b) => ({ ...b, [p.clave]: false }));
    }
  };

  const restaurarPlantilla = async () => {
    setBusy((b) => ({ ...b, plantilla: true }));
    try {
      for (const [clave, valor] of Object.entries(DEFAULT_EMPRESA)) {
        await api.put(`/parametros/${clave}`, { valor });
      }
      pushToast("success", "Datos de la empresa restaurados (usados en las actas PDF)");
      setEditing({});
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy((b) => ({ ...b, plantilla: false }));
    }
  };

  const labelOf = (clave) =>
    clave.replace(/^empresa_/, "Nombre: ").replace(/^encargado_/, "Encargado: ")
      .replace(/^destino_/, "").split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Parámetros del sistema · los datos de empresa se usan en las actas PDF"
        icon="gear"
        actions={
          <button className="btn btn-sm btn-soft" disabled={busy.plantilla} onClick={restaurarPlantilla}>
            {busy.plantilla ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <><i className="bi bi-arrow-counterclockwise me-1" /> Restaurar datos de empresa</>
            )}
          </button>
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : params.length === 0 ? (
        <Card>
          <EmptyState
            icon="gear"
            title="Sin parámetros"
            hint='Pulsa "Restaurar datos de empresa" para crear el conjunto por defecto'
          />
        </Card>
      ) : (
        Object.entries(groups).map(([grupo, items]) => (
          <div key={grupo} className="mb-3">
            <h6 className="text-secondary small text-uppercase fw-bold mb-2">
              {grupo} {!defaultPresent && grupo === "General" && <span className="badge eta-badge ms-1" style={{ background: "#fd7e141c", color: "#fd7e14" }}>sin plantilla</span>}
            </h6>
            <Card bodyClassName="p-3">
              <div className="row g-3">
                {items.map((p) => (
                  <div key={p.id} className="col-md-6 col-xl-4">
                    <label className="form-label small fw-semibold mb-1 d-block">
                      {labelOf(p.clave)} <code className="text-secondary fw-normal" style={{ fontSize: 10 }}>{p.clave}</code>
                    </label>
                    <div className="d-flex gap-2">
                      <input
                        className="form-control form-control-sm"
                        value={editing[p.clave] ?? p.valor ?? ""}
                        onChange={(e) => setEditing((s) => ({ ...s, [p.clave]: e.target.value }))}
                        placeholder={p.descripcion || ""}
                      />
                      <button className="btn btn-sm btn-brand" disabled={busy[p.clave]} onClick={() => save(p)}>
                        {busy[p.clave] ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg"></i>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}