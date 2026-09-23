import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import { Badge, Card, EmptyState, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDate } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function Bajas() {
  const { can } = useAuth();
  const { pushToast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loader = useMemo(
    () => api.get(`/activos/bajas${filtro ? `?estado=${filtro}` : ""}`),
    [filtro]
  );
  const { data, loading, reload } = useAsync(() => loader, [filtro]);
  const items = data || [];

  const aprobar = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/activos/bajas/${id}/aprobar`, {});
      pushToast("success", "Baja aprobada");
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusyId(null);
    }
  };

  const rechazar = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/activos/bajas/${id}/rechazar`, {});
      pushToast("success", "Baja rechazada");
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusyId(null);
    }
  };

  const descargarActa = async (b) => {
    try {
      if (!b.acta_id) return pushToast("warning", "Esta baja no tiene acta generada");
      await downloadFile(`/activos/actas/${b.acta_id}/pdf`, `acta-${b.numero}.pdf`);
    } catch (e) { pushToast("error", e.message); }
  };

  return (
    <div>
      <PageHeader
        title="Bajas"
        subtitle="Solicitudes de baja de activos por donación, daño, venta u obsolescencia"
        icon="archive"
        actions={
          <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option>
            <option value="SOLICITADA">Solicitadas</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="RECHAZADA">Rechazadas</option>
          </select>
        }
      />

      <Card title={`Bajas (${items.length})`} icon="file-earmark-x">
        {loading ? (
          <div className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="archive" title="Sin solicitudes de baja" hint="Las bajas se solicitan desde el detalle de cada activo" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Activo</th><th>Motivo</th><th>Descripción</th><th>Solicitud</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td><span className="fw-semibold">{b.numero}</span></td>
                    <td>{b.activo ? <Link to={`/activos/${b.activo.id}`} className="fw-semibold">{b.activo.codigo}</Link> : `#${b.activo_id}`}</td>
                    <td><Badge estado={estadoInfo(b.motivo_tipo)} /></td>
                    <td className="small text-secondary">{b.motivo_descripcion || "—"}</td>
                    <td className="text-secondary small">{fmtDate(b.fecha_solicitud)}</td>
                    <td><Badge estado={estadoInfo(b.estado)} /></td>
                    <td className="text-end">
                      {b.estado === "SOLICITADA" && can("aprobar_movimientos") && (
                        <>
                          <button className="btn btn-sm btn-soft" disabled={busyId === b.id} onClick={() => aprobar(b.id)}>
                            <i className="bi bi-check2 me-1" /> Aprobar
                          </button>
                          <button className="btn btn-sm btn-outline-danger ms-1" disabled={busyId === b.id} onClick={() => rechazar(b.id)}>
                            Rechazar
                          </button>
                        </>
                      )}
                      {b.acta_id && (
                        <button className="btn btn-sm btn-light ms-1" disabled={busyId === b.id} title="Descargar acta" onClick={() => descargarActa(b)}>
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
    </div>
  );
}