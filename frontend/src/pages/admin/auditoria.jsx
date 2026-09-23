import { useMemo, useState } from "react";
import api from "../../api/client";
import { Badge, Card, EmptyState, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { fmtDateTime } from "../../utils/format";

export default function Auditoria() {
  const [modulo, setModulo] = useState("");
  const [page, setPage] = useState(1);

  const loader = useMemo(
    () => api.get(`/usuarios/auditoria?page=${page}&size=25${modulo ? `&modulo=${modulo}` : ""}`),
    [page, modulo]
  );
  const { data, loading } = useAsync(() => loader, [page, modulo]);
  const items = data?.items || [];
  const pages = data?.pages || 1;

  const modulos = [...new Set(items.map((i) => i.modulo))];

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Registro inmutable de cambios: quién, qué y cuándo"
        icon="clipboard-data"
        actions={
          <select className="form-select form-select-sm w-auto" value={modulo} onChange={(e) => { setPage(1); setModulo(e.target.value); }}>
            <option value="">Todos los módulos</option>
            {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        }
      />

      <Card title={`Eventos registrados (${data?.total ?? 0})`} icon="shield-lock" bodyClassName="p-0">
        {loading ? (
          <div className="text-center py-5"><span className="spinner-border spinner-border-sm eticos-spinner" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="clipboard-x" title="Sin eventos" hint="Las acciones del sistema quedarán registradas aquí" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr>
                <th>Fecha</th><th>Módulo</th><th>Acción</th><th>Entidad</th><th>Cambio</th><th>Usuario</th>
              </tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="text-secondary small text-nowrap">{fmtDateTime(a.fecha)}</td>
                    <td><Badge estado={{ label: a.modulo, cls: "info" }} /></td>
                    <td>
                      <Badge estado={{ label: a.accion, cls: a.accion === "ELIMINAR" ? "danger" : a.accion === "CREAR" ? "success" : "primary" }} />
                    </td>
                    <td className="small">{a.entidad_tipo} #{a.entidad_id}{a.campo ? ` · ${a.campo}` : ""}</td>
                    <td className="small text-secondary" style={{ maxWidth: 320 }}>
                      <span className="text-danger text-decoration-line-through">{a.valor_anterior || ""}</span>
                      {a.valor_anterior && a.valor_nuevo && " → "}
                      <span className="text-success">{a.valor_nuevo || ""}</span>
                    </td>
                    <td className="small">#{a.usuario_id || "—"}</td>
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
    </div>
  );
}