import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api/client";
import { Badge, Card, EmptyState, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { estadoInfo, fmtDateTime } from "../../utils/format";
import { useToast } from "../../context/ToastContext";

export default function Actas() {
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [enviando, setEnviando] = useState(null);

  const loader = useMemo(() => api.get(`/activos/movimientos/actas?page=${page}&size=20`), [page]);
  const { data, loading, reload } = useAsync(() => loader, [page]);
  const items = data?.items || [];
  const pages = data?.pages || 1;

  const descargar = async (a) => {
    setBusyId(a.id);
    try {
      const name = await downloadFile(`/activos/actas/${a.id}/pdf`, `${a.numero}.pdf`);
      pushToast("success", `Acta ${name || a.numero} descargada`);
    } catch (e) {
      pushToast("error", e.message || "No se pudo generar el PDF");
    } finally {
      setBusyId(null);
    }
  };

  const enviar = async (a, medio, destino) => {
    setBusyId(a.id);
    try {
      const r = await api.post(`/activos/actas/${a.id}/enviar`, { medio, destino });
      if (medio === "whatsapp" && r.data?.enlace) {
        window.open(r.data.enlace, "_blank");
        pushToast("success", "Enlace de WhatsApp generado; adjunta el PDF en el chat");
      } else {
        pushToast("success", `Acta enviada a ${r.data?.destino || destino}`);
      }
      setEnviando(null);
    } catch (e) {
      pushToast("error", e.message || "No se pudo enviar el acta");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Actas"
        subtitle="Documentos de entrada, salida, préstamo y mantenimiento de equipos"
        icon="file-earmark-text"
        actions={
          <button className="btn btn-sm btn-soft" onClick={reload}>
            <i className="bi bi-arrow-clockwise me-1" /> Refrescar
          </button>
        }
      />

      <Card title={`Actas generadas (${data?.total ?? 0})`} icon="journal-text">
        {loading ? (
          <div className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="file-earmark-text" title="Sin actas" hint="Cada movimiento, préstamo o mantenimiento cerrado genera un acta" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Número</th><th>Tipo</th><th>Operación</th><th>Activo</th><th>Fecha</th><th>Estado</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td><span className="fw-semibold">{a.numero}</span></td>
                    <td>{a.tipo}</td>
                    <td><Badge estado={estadoInfo(a.operacion_tipo)} /></td>
                    <td>{a.activo ? <Link to={`/activos/${a.activo.id}`} className="fw-semibold">{a.activo.codigo}</Link> : "—"}</td>
                    <td className="text-secondary small">{fmtDateTime(a.fecha)}</td>
                    <td><Badge estado={estadoInfo(a.estado)} /></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-brand ms-1" title="Enviar acta" disabled={busyId === a.id} onClick={() => setEnviando(a)}>
                        <i className="bi bi-send me-1" /> Enviar
                      </button>
                      <button className="btn btn-sm btn-soft ms-1" disabled={busyId === a.id} onClick={() => descargar(a)}>
                        {busyId === a.id ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <><i className="bi bi-file-earmark-pdf me-1" /> PDF</>
                        )}
                      </button>
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

      {enviando && (
        <EnviarModal
          acta={enviando}
          onClose={() => setEnviando(null)}
          onEnviar={(medio, destino) => enviar(enviando, medio, destino)}
        />
      )}
    </div>
  );
}

function EnviarModal({ acta, onClose, onEnviar }) {
  const [medio, setMedio] = useState("correo");
  const [destino, setDestino] = useState("");

  return (
    <Modal open title={`Enviar ${acta.numero}`} icon="send" onClose={onClose}
      footer={
        <>
          <button className="btn btn-sm btn-light" onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={!destino.trim()} onClick={() => onEnviar(medio, destino.trim())}>
            <i className="bi bi-send me-1" /> Enviar
          </button>
        </>
      }>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label small fw-semibold">Medio</label>
          <div className="btn-group w-100">
            <button className={`btn btn-sm ${medio === "correo" ? "btn-brand" : "btn-light"}`} onClick={() => setMedio("correo")}>
              <i className="bi bi-envelope me-1" /> Correo
            </button>
            <button className={`btn btn-sm ${medio === "whatsapp" ? "btn-brand" : "btn-light"}`} onClick={() => setMedio("whatsapp")}>
              <i className="bi bi-whatsapp me-1" /> WhatsApp
            </button>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label small fw-semibold">{medio === "correo" ? "Correo de destino *" : "WhatsApp (número) *"}</label>
          <input className="form-control" type={medio === "correo" ? "email" : "tel"} value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder={medio === "correo" ? "cliente@empresa.com" : "57 300 000 0000"} />
        </div>
        {medio === "whatsapp" && (
          <div className="col-12"><small className="text-secondary">Se abrirá un chat de WhatsApp con el resumen del acta; adjunta el PDF descargado manualmente.</small></div>
        )}
      </div>
    </Modal>
  );
}