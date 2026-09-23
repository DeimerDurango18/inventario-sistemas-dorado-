import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { EmptyState, PageHeader } from "../../components/ui";

export default function ActivosList() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const size = 20;
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ estado_id: "", categoria_id: "", sede_id: "" });
  const [categorias, setCategorias] = useState([]);
  const [estados, setEstados] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFiltros = useCallback(() => {
    Promise.all([
      api.get("/catalogo/categorias/todas").catch(() => ({ data: { items: [] } })),
      api.get("/catalogo/estados").catch(() => ({ data: [] })),
      api.get("/geo/sedes").catch(() => ({ data: [] })),
    ]).then(([c, e, s]) => {
      setCategorias(c.data?.items || c.data || []);
      setEstados(e.data || []);
      setSedes(s.data || []);
    });
  }, []);

  useEffect(loadFiltros, [loadFiltros]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    const params = new URLSearchParams({ page, size });
    if (q) params.set("q", q);
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    api
      .get(`/activos?${params.toString()}`)
      .then(({ data }) => {
        if (cancelado) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => !cancelado && setLoading(false));
    return () => (cancelado = true);
  }, [page, q, filters]);

  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <div>
      <PageHeader
        title={`Activos (${total})`}
        subtitle="Inventario de equipos de TI"
        icon="box-seam"
        actions={
          can("crear_activos") && (
            <Link to="/activos/nuevo" className="btn btn-sm btn-brand">
              <i className="bi bi-plus-lg me-1" /> Nuevo activo
            </Link>
          )
        }
      />

      <div className="eticos-card p-3 mb-3">
        <div className="row g-2">
          <div className="col-12 col-lg-4">
            <div className="eticos-search">
              <i className="bi bi-search"></i>
              <input
                className="form-control form-control-sm"
                placeholder="Buscar por código, serial, inventario, placa…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg-3">
            <select className="form-select form-select-sm" value={filters.estado_id} onChange={(e) => { setFilters({ ...filters, estado_id: e.target.value }); setPage(1); }}>
              <option value="">Estado: todos</option>
              {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3 col-lg-3">
            <select className="form-select form-select-sm" value={filters.categoria_id} onChange={(e) => { setFilters({ ...filters, categoria_id: e.target.value }); setPage(1); }}>
              <option value="">Categoría: todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <select className="form-select form-select-sm" value={filters.sede_id} onChange={(e) => { setFilters({ ...filters, sede_id: e.target.value }); setPage(1); }}>
              <option value="">Sede: todas</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="eticos-card p-0">
        {items.length === 0 && !loading ? (
          <EmptyState icon="box-seam" title="Sin resultados" hint="Ajusta la búsqueda o registra un nuevo activo" />
        ) : (
          <div className="eticos-table-wrap">
            <table className="table table-hover table-clickable align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Serial</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Stock</th>
                  <th>Sede</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="text-center py-4"><span className="spinner-border spinner-border-sm eticos-spinner" /></td></tr>
                )}
                {items.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/activos/${a.id}`)}>
                    <td><span className="fw-semibold">{a.codigo}</span></td>
                    <td><span className="badge eta-badge" style={{ background: "#e9f2fc", color: "#0b66c2" }}>{a.tipo}</span></td>
                    <td className="small">{a.serial || "—"}</td>
                    <td className="small">{a.categoria?.nombre || "—"}</td>
                    <td className="small">{a.marca?.nombre || "—"}</td>
                    <td>
                      <span className="badge eta-badge" style={(a.cantidad_stock ?? 0) > 0 ? { background: "#e9f2fc", color: "#0b66c2", border: "1px solid #0b66c240" } : { background: "#eb3f5b1c", color: "#eb3f5b" }}>
                        {a.cantidad_stock ?? 0}
                      </span>
                    </td>
                    <td className="small">{a.ubicacion?.sede?.nombre || "—"}</td>
                    <td className="small">{a.responsable?.nombre || "—"}</td>
                    <td>
                      <span className="badge eta-badge" style={{ background: `${a.estado?.color || "#6c757d"}22`, color: a.estado?.color || "#6c757d", border: `1px solid ${a.estado?.color || "#6c757d"}55` }}>
                        {a.estado?.nombre || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-secondary">{total} registro(s)</small>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="btn btn-sm btn-light disabled">Página {page} de {pages}</span>
          <button className="btn btn-sm btn-light" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}