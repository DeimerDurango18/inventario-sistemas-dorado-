import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { Badge, Card, ConfirmModal, EmptyState, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDateTime } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function Movimientos() {
  const { can } = useAuth();
  const { pushToast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [anulando, setAnulando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  const q = useMemo(
    () => api.get(`/activos/movimientos?page=${page}&size=20${filtro ? `&tipo=${filtro}` : ""}`),
    [page, filtro]
  );
  const { data, loading, reload } = useAsync(() => q, [page, filtro]);
  const items = data?.items || [];
  const pages = data?.pages || 1;

  const confirmarAnulacion = async () => {
    if (!motivo.trim()) return pushToast("warning", "Indica el motivo de la anulación");
    setBusy(true);
    try {
      await api.put(`/activos/movimientos/${anulando.id}/anular`, { motivo });
      pushToast("success", `Movimiento ${anulando.numero} anulado`);
      setAnulando(null);
      setMotivo("");
      reload();
    } catch (e) {
      pushToast("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const esAnulable = (m) => can("aprobar_movimientos") && m.estado !== "ANULADO";

  return (
    <div>
      <PageHeader
        title="Movimientos"
        subtitle="Historial de asignaciones, traslados y devoluciones de equipos"
        icon="arrow-left-right"
        actions={
          <>
            <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => { setPage(1); setFiltro(e.target.value); }}>
              <option value="">Todos los tipos</option>
              <option value="ASIGNACION">Asignación</option>
              <option value="TRASLADO">Traslado</option>
              <option value="DEVOLUCION">Devolución</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
            <button className="btn btn-sm btn-brand" onClick={reload}>
              <i className="bi bi-arrow-clockwise me-1" /> Refrescar
            </button>
          </>
        }
      />

      <Card title={`Movimientos registrados (${data?.total ?? 0})`} icon="list-check">
        {loading ? (
          <div className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="arrow-left-right" title="Sin movimientos" hint="Los movimientos aparecen al asignar, trasladar o devolver equipos" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Fecha</th><th>Activo</th><th>Tipo</th><th>Origen → Destino</th><th>Responsable</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td><span className="fw-semibold">{m.numero}</span></td>
                    <td className="text-secondary">{fmtDateTime(m.fecha)}</td>
                    <td>{m.activo ? <Link to={`/activos/${m.activo.id}`} className="fw-semibold">{m.activo.codigo}</Link> : `#${m.activo_id}`}</td>
                    <td><Badge estado={estadoInfo(m.tipo)} /></td>
                    <td className="small text-secondary">
                      {m.origen_ubicacion?.nombre || "—"} <i className="bi bi-arrow-right text-primary"></i> {m.destino_ubicacion?.nombre || "—"}
                    </td>
                    <td className="small">{m.responsable_nuevo?.nombre || m.responsable_anterior?.nombre || "—"}</td>
                    <td><Badge estado={estadoInfo(m.estado)} /></td>
                    <td className="text-end">
                      {esAnulable(m) && (
                        <button className="btn btn-sm btn-light text-danger" title="Anular" onClick={() => setAnulando(m)}>
                          <i className="bi bi-x-octagon"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-2 border-top">
            <small className="text-secondary">Página {page} de {pages}</small>
            <div className="btn-group btn-group-sm">
              <button className="btn btn-light" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
              <button className="btn btn-light" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!anulando}
        title={`Anular ${anulando?.numero || ""}`}
        message="La anulación revierte el estado del activo. Este cambio queda en la auditoría."
        confirmLabel="Anular movimiento"
        danger
        busy={busy}
        onClose={() => setAnulando(null)}
        onConfirm={confirmarAnulacion}
      >
        <div className="mb-2 text-secondary small">Motivo *</div>
        <input className="form-control" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: registro incorrecto" autoFocus />
      </ConfirmModal>
    </div>
  );
}