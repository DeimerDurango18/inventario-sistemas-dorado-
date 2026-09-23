import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import { Badge, Card, EmptyState, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDate } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function Prestamos() {
  const { can } = useAuth();
  const { pushToast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loader = useMemo(
    () => api.get(`/activos/prestamos${filtro ? `?estado=${filtro}` : ""}`),
    [filtro]
  );
  const { data, loading, reload } = useAsync(() => loader, [filtro]);
  const items = data || [];

  const accion = async (id, tipo, label) => {
    setBusyId(id);
    try {
      await api.put(`/activos/prestamos/${id}/${tipo}`, {});
      pushToast("success", label);
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusyId(null);
    }
  };

  const descargarActa = async (p) => {
    try {
      if (!p.acta_id) return pushToast("warning", "Este préstamo no tiene acta generada");
      await downloadFile(`/activos/actas/${p.acta_id}/pdf`, `acta-${p.numero}.pdf`);
    } catch (e) { pushToast("error", e.message); }
  };

  return (
    <div>
      <PageHeader
        title="Préstamos"
        subtitle="Solicitudes de préstamo de equipos y su devolución"
        icon="box2-heart"
        actions={
          <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="SOLICITADO">Solicitados</option>
            <option value="ACTIVO">Activos</option>
            <option value="DEVUELTO">Devueltos</option>
            <option value="RECHAZADO">Rechazados</option>
          </select>
        }
      />

      <Card title={`Préstamos (${items.length})`} icon="box2">
        {loading ? (
          <div className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="box2-heart" title="Sin préstamos" hint="Las solicitudes de préstamo aparecerán aquí" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Activo</th><th>Responsable</th><th>Fecha</th><th>Devolución prevista</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td><span className="fw-semibold">{p.numero}</span></td>
                    <td>{p.activo ? <Link to={`/activos/${p.activo.id}`} className="fw-semibold">{p.activo.codigo}</Link> : `#${p.activo_id}`}</td>
                    <td className="small">{p.responsable?.nombre || "—"}</td>
                    <td className="text-secondary small">{fmtDate(p.fecha_prestamo)}</td>
                    <td className="text-secondary small">{fmtDate(p.fecha_prevista_devolucion)}</td>
                    <td><Badge estado={estadoInfo(p.estado)} /></td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        {p.estado === "SOLICITADO" && can("aprobar_movimientos") && (
                          <>
                            <button className="btn btn-sm btn-soft" disabled={busyId === p.id} onClick={() => accion(p.id, "aprobar", "Préstamo aprobado")}>
                              <i className="bi bi-check2 me-1" /> Aprobar
                            </button>
                            <button className="btn btn-sm btn-outline-danger" disabled={busyId === p.id} onClick={() => accion(p.id, "rechazar", "Préstamo rechazado")}>
                              Rechazar
                            </button>
                          </>
                        )}
                        {p.estado !== "DEVUELTO" && p.estado !== "RECHAZADO" && can("crear_movimientos") && (
                          <button className="btn btn-sm btn-light" disabled={busyId === p.id} onClick={() => accion(p.id, "devolver", "Préstamo devuelto")}>
                            <i className="bi bi-box-arrow-in-left me-1" /> Devolver
                          </button>
                        )}
                        {p.acta_id && (
                          <button className="btn btn-sm btn-light" disabled={busyId === p.id} title="Descargar acta" onClick={() => descargarActa(p)}>
                            <i className="bi bi-file-earmark-pdf text-danger"></i>
                          </button>
                        )}
                      </div>
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