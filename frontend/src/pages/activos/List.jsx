import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function ActivosList() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ estado_id: "", categoria_id: "", sede_id: "" });
  const [categorias, setCategorias] = useState([]);
  const [estados, setEstados] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFiltros = async () => {
    const [c, e, s] = await Promise.all([
      api.get("/catalogo/categorias/todas").catch(() => ({ data: { items: [] } })),
      api.get("/catalogo/estados").catch(() => ({ data: [] })),
      api.get("/geo/sedes").catch(() => ({ data: [] })),
    ]);
    setCategorias(c.data?.items || c.data || []);
    setEstados(e.data || []);
    setSedes(s.data || []);
  };

  useEffect(() => {
    loadFiltros();
  }, []);

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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">Activos TI</h5>
        {can("crear_activos") && (
          <Link to="/activos/nuevo" className="btn text-white btn-sm" style={{ background: "var(--eticos-primary)" }}>
            <i className="bi bi-plus-lg me-1"></i>Nuevo activo
          </Link>
        )}
      </div>

      <div className="card stat-card mb-3">
        <div className="card-body py-2">
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <input
                className="form-control form-control-sm"
                placeholder="Buscar por cÃ³digo, serial, inventario, placaâ€¦"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select form-select-sm" value={filters.estado_id} onChange={(e) => { setFilters({ ...filters, estado_id: e.target.value }); setPage(1); }}>
                <option value="">Estado: todos</option>
                {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select form-select-sm" value={filters.categoria_id} onChange={(e) => { setFilters({ ...filters, categoria_id: e.target.value }); setPage(1); }}>
                <option value="">CategorÃ­a: todas</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select form-select-sm" value={filters.sede_id} onChange={(e) => { setFilters({ ...filters, sede_id: e.target.value }); setPage(1); }}>
                <option value="">Sede: todas</option>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card stat-card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-clickable mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>CÃ³digo</th>
                  <th>Tipo</th>
                  <th>Serial</th>
                  <th>CategorÃ­a</th>
                  <th>Marca</th>
                  <th>Sede</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="text-center py-4">Cargandoâ€¦</td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-4 text-secondary">Sin resultados</td></tr>
                )}
                {items.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/activos/${a.id}`)}>
                    <td className="fw-semibold">{a.codigo}</td>
                    <td>{a.tipo}</td>
                    <td>{a.serial || "â€”"}</td>
                    <td>{a.categoria?.nombre || "â€”"}</td>
                    <td>{a.marca?.nombre || "â€”"}</td>
                    <td>{a.ubicacion?.sede?.nombre || "â€”"}</td>
                    <td>{a.responsable?.nombre || "â€”"}</td>
                    <td>
                      <span className="badge xml-rounded-pill badge-estado" style={{ background: a.estado?.color || "#6c757d" }}>
                        {a.estado?.nombre || "â€”"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-secondary">{total} registro(s)</small>
        <div className="btn-group">
          <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="btn btn-sm btn-light disabled">PÃ¡gina {page} de {pages}</span>
          <button className="btn btn-outline-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}