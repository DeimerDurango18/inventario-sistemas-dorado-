import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { Card, EmptyState, LoadingBlock, Modal, PageHeader } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../context/ToastContext";

function CRUDTable({ columns, rows, onEdit, onDelete, deleteLabel = "Desactivar", empty, rowKey = "id" }) {
  const [busyId, setBusyId] = useState(null);
  return (
    <div className="eticos-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr>
          {columns.map((c) => <th key={c.key}>{c.label}</th>)}
          <th className="text-end">Acciones</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + 1}><EmptyState icon="grid" title={empty || "Sin registros"} /></td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r[rowKey]}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className || ""}>
                    {c.render ? c.render(r) : r[c.key] ?? "—"}
                  </td>
                ))}
                <td className="text-end">
                  <div className="d-flex gap-1 justify-content-end">
                    {onEdit && (
                      <button className="btn btn-sm btn-light" title="Editar" onClick={() => onEdit(r)}>
                        <i className="bi bi-pencil text-primary"></i>
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn btn-sm btn-light" title={deleteLabel} disabled={busyId === r.id} onClick={async () => {
                        setBusyId(r.id);
                        try {
                          await onDelete(r);
                        } finally {
                          setBusyId(null);
                        }
                      }}>
                        <i className="bi bi-x-circle text-danger"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Catalogos() {
  const { pushToast } = useToast();
  const [tab, setTab] = useState("categorias");
  const [reloadTick, setReloadTick] = useState(0);
  const [editando, setEditando] = useState(null); // {tipo, item}

  const load = () => setReloadTick((t) => t + 1);

  const all = useAsync(async () => {
    const [categorias, subcategorias, marcas, modelos, proveedores, estados, atributos, subTodos] = await Promise.all([
      api.get("/catalogo/categorias?size=200"),
      api.get("/catalogo/subcategorias"),
      api.get("/catalogo/marcas?size=200"),
      api.get("/catalogo/modelos"),
      api.get("/catalogo/proveedores?size=200"),
      api.get("/catalogo/estados"),
      api.get("/catalogo/atributos"),
      api.get("/catalogo/categorias/todas"),
    ]);
    return {
      categorias: categorias.data?.items || categorias.data || [],
      subcategorias: subcategorias.data || [],
      marcas: marcas.data?.items || marcas.data || [],
      modelos: modelos.data || [],
      proveedores: proveedores.data?.items || proveedores.data || [],
      estados: estados.data || [],
      atributos: atributos.data || [],
      cats: subTodos.data || [],
    };
  }, [reloadTick]);

  const d = all.data || {};
  const loading = all.loading;

  const del = (tipo, label) => async (item) => {
    try {
      await api.del(`/catalogo/${tipo}/${item.id}`);
      pushToast("success", `${label} desactivado/a`);
      load();
    } catch (e) {
      pushToast("error", e.message);
    }
  };

  const tabs = [
    { key: "categorias", label: "Categorías", icon: "tags" },
    { key: "marcas", label: "Marcas", icon: "award" },
    { key: "modelos", label: "Modelos", icon: "cpu" },
    { key: "proveedores", label: "Proveedores", icon: "truck" },
    { key: "estados", label: "Estados", icon: "palette" },
    { key: "atributos", label: "Atributos", icon: "list-ul" },
  ];

  const nuevo = (tipo) => setEditando({ tipo, item: null });

  return (
    <div>
      <PageHeader title="Catálogos" subtitle="Datos maestros del sistema" icon="grid-1x2" />

      <div className="d-flex gap-1 flex-wrap mb-3">
        {tabs.map((t) => (
          <button key={t.key} className={`btn btn-sm ${tab === t.key ? "btn-brand" : "btn-light"}`} onClick={() => setTab(t.key)}>
            <i className={`bi bi-${t.icon} me-1`}></i> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : tab === "categorias" ? (
        <Card title={`Categorías y subcategorías (${d.categorias.length})`} icon="tags"
          actions={<button className="btn btn-sm btn-brand" onClick={() => nuevo("categorias")}><i className="bi bi-plus-lg me-1" /> Nueva categoría</button>}>
          <CRUDTable
            columns={[
              { key: "id", label: "ID" },
              { key: "nombre", label: "Nombre" },
              { key: "activo", label: "Estado", render: (r) => r.activo ? <span className="badge eta-badge" style={{ background: "#28a7451c", color: "#28a745" }}>Activa</span> : <span className="badge eta-badge" style={{ background: "#6c757d1c", color: "#6c757d" }}>Inactiva</span> },
              { key: "subs", label: "Subcategorías", render: (r) => <span className="small text-secondary">{r.subcategorias?.length ?? d.subcategorias.filter((s) => s.categoria_id === r.id).length}</span> },
            ]}
            rows={d.categorias}
            onDelete={del("categorias", "Categoría")}
            empty="Sin categorías"
          />
        </Card>
      ) : tab === "marcas" ? (
        <Card title={`Marcas (${d.marcas.length})`} icon="award"
          actions={<button className="btn btn-sm btn-brand" onClick={() => nuevo("marcas")}><i className="bi bi-plus-lg me-1" /> Nueva marca</button>}>
          <CRUDTable
            columns={[
              { key: "id", label: "ID" },
              { key: "nombre", label: "Nombre" },
              { key: "activo", label: "Estado", render: (r) => r.activo ? <span className="badge eta-badge" style={{ background: "#28a7451c", color: "#28a745" }}>Activa</span> : <span className="badge eta-badge" style={{ background: "#6c757d1c", color: "#6c757d" }}>Inactiva</span> },
              { key: "n", label: "Modelos", render: () => "—" },
            ]}
            rows={d.marcas}
            onDelete={del("marcas", "Marca")}
            empty="Sin marcas"
          />
        </Card>
      ) : tab === "modelos" ? (
        <Card title={`Modelos (${d.modelos.length})`} icon="cpu"
          actions={<button className="btn btn-sm btn-brand" onClick={() => nuevo("modelos")}><i className="bi bi-plus-lg me-1" /> Nuevo modelo</button>}>
          <CRUDTable
            columns={[
              { key: "id", label: "ID" },
              { key: "nombre", label: "Nombre" },
              { key: "marca", label: "Marca", render: (r) => <span className="small">{d.marcas.find((m) => m.id === r.marca_id)?.nombre || "—"}</span> },
            ]}
            rows={d.modelos}
            onEdit={(it) => setEditando({ tipo: "modelos", item: it })}
            empty="Sin modelos"
          />
        </Card>
      ) : tab === "proveedores" ? (
        <Card title={`Proveedores (${d.proveedores.length})`} icon="truck"
          actions={<button className="btn btn-sm btn-brand" onClick={() => nuevo("proveedores")}><i className="bi bi-plus-lg me-1" /> Nuevo proveedor</button>}>
          <CRUDTable
            columns={[
              { key: "nit", label: "NIT" },
              { key: "nombre", label: "Nombre" },
              { key: "contacto", label: "Contacto" },
              { key: "correo", label: "Correo" },
              { key: "activo", label: "Estado", render: (r) => r.activo ? <span className="badge eta-badge" style={{ background: "#28a7451c", color: "#28a745" }}>Activo</span> : <span className="badge eta-badge" style={{ background: "#6c757d1c", color: "#6c757d" }}>Inactivo</span> },
            ]}
            rows={d.proveedores}
            onEdit={(it) => setEditando({ tipo: "proveedores", item: it })}
            onDelete={del("proveedores", "Proveedor")}
            empty="Sin proveedores"
          />
        </Card>
      ) : tab === "estados" ? (
        <Card title={`Estados de activo (${d.estados.length})`} icon="palette"
          actions={<button className="btn btn-sm btn-brand" onClick={() => nuevo("estados")}><i className="bi bi-plus-lg me-1" /> Nuevo estado</button>}>
          <CRUDTable
            columns={[
              { key: "codigo", label: "Código" },
              { key: "nombre", label: "Nombre" },
              { key: "color", label: "Color", render: (r) => <span className="badge eta-badge" style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}><i className="bi bi-circle-fill me-1" style={{ fontSize: 8 }} />{r.color}</span> },
            ]}
            rows={d.estados}
            onEdit={(it) => setEditando({ tipo: "estados", item: it })}
            empty="Sin estados"
          />
        </Card>
      ) : (
        <Card title={`Definiciones de atributos (${d.atributos.length})`} icon="list-ul"
          actions={<button className="btn btn-sm btn-brand" onClick={() => nuevo("atributos")}><i className="bi bi-plus-lg me-1" /> Nuevo atributo</button>}>
          <CRUDTable
            columns={[
              { key: "id", label: "ID" },
              { key: "subcategoria", label: "Subcategoría", render: (r) => <span className="small">{d.subcategorias.find((s) => s.id === r.subcategoria_id)?.nombre || "—"}</span> },
              { key: "nombre", label: "Nombre" },
              { key: "tipo_dato", label: "Tipo" },
              { key: "requerido", label: "Requerido", render: (r) => r.requerido ? "Sí" : "No" },
            ]}
            rows={d.atributos}
            empty="Sin atributos"
          />
        </Card>
      )}

      <CatalogModal
        tipo={editando?.tipo}
        item={editando?.item}
        cats={d.cats}
        marcas={d.marcas}
        subcategorias={d.subcategorias}
        onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); load(); }}
        pushToast={pushToast}
      />
    </div>
  );
}

function CatalogModal({ tipo, item, cats, marcas, subcategorias, onClose, onSaved, pushToast }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const esEdit = !!item;

  useEffect(() => {
    if (!tipo) return;
    const base = item ? { ...item } : {};
    if (tipo === "modelos") base.marca_id = item?.marca_id ?? "";
    if (tipo === "estados") base.codigo = item?.codigo ?? "";
    if (tipo === "atributos") {
      base.subcategoria_id = item?.subcategoria_id ?? "";
      base.nombre = item?.nombre ?? "";
      base.tipo_dato = item?.tipo_dato ?? "TEXTO";
      base.requerido = item?.requerido ?? false;
    }
    setForm(base);
  }, [tipo, item]);

  if (!tipo || !form) return null;

  const is = (key) => esEdit && tipo === key;
  const isNew = (key) => !esEdit && tipo === key;
  const createPath = (key) => ({ categorias: "/catalogo/categorias", marcas: "/catalogo/marcas", modelos: "/catalogo/modelos", proveedores: "/catalogo/proveedores", estados: "/catalogo/estados", atributos: "/catalogo/atributos" }[key]);

  const guardar = async () => {
    setBusy(true);
    try {
      let body;
      if (tipo === "categorias") body = { nombre: form.nombre, subcategorias: Array.isArray(form.subs) ? form.subs : undefined };
      else if (tipo === "marcas") body = { nombre: form.nombre };
      else if (tipo === "modelos") body = { nombre: form.nombre, marca_id: form.marca_id ? Number(form.marca_id) : null };
      else if (tipo === "proveedores") body = { nombre: form.nombre, nit: form.nit, contacto: form.contacto, telefono: form.telefono, correo: form.correo };
      else if (tipo === "estados") body = esEdit ? { nombre: form.nombre, color: form.color } : { codigo: form.codigo, nombre: form.nombre, color: form.color };
      else body = { subcategoria_id: Number(form.subcategoria_id), nombre: form.nombre, tipo_dato: form.tipo_dato, requerido: form.requerido };

      if (esEdit) {
        if (tipo === "modelos") await api.put(`/catalogo/modelos/${item.id}`, body);
        else if (tipo === "proveedores") await api.put(`/catalogo/proveedores/${item.id}`, body);
        else if (tipo === "estados") await api.put(`/catalogo/estados/${item.id}`, body);
      } else {
        await api.post(createPath(tipo), body);
      }
      pushToast("success", esEdit ? `${texto(tipo)} actualizado` : `${texto(tipo)} creado`);
    } catch (e) {
      pushToast("error", e.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  };

  const texto = (t) => ({ categorias: "Categoría", marcas: "Marca", modelos: "Modelo", proveedores: "Proveedor", estados: "Estado", atributos: "Atributo" }[t]);
  const titulo = (esEdit ? "Editar " : "Nuevo ") + texto(tipo);

  return (
    <Modal open={!!tipo} title={titulo} icon={esEdit ? "pencil" : "plus-circle"} onClose={onClose} busy={busy}
      footer={
        <>
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-brand" disabled={busy} onClick={guardar}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <div className="row g-3">
        <div className="col-md-8">
          <label className="form-label small fw-semibold">Nombre *</label>
          <input className="form-control" value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        {tipo === "categorias" && !esEdit && (
          <div className="col-12">
            <label className="form-label small fw-semibold">Subcategorías (separadas por coma)</label>
            <textarea className="form-control" rows={2} value={(form.subs || []).join(", ")} onChange={(e) => setForm({ ...form, subs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Ej: Escritorio, Todo en uno" />
          </div>
        )}
        {tipo === "estados" && !esEdit && (
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Código *</label>
            <input className="form-control text-uppercase" value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="EN_USO" />
          </div>
        )}
        {tipo === "estados" && (
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Color</label>
            <input type="color" className="form-control form-control-color" value={form.color || "#0b66c2"} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        )}
        {tipo === "modelos" && (
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Marca</label>
            <select className="form-select" value={form.marca_id || ""} onChange={(e) => setForm({ ...form, marca_id: e.target.value })}>
              <option value="">Seleccionar…</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        )}
        {tipo === "proveedores" && (
          <>
            <div className="col-md-4"><label className="form-label small fw-semibold">NIT</label><input className="form-control" value={form.nit || ""} onChange={(e) => setForm({ ...form, nit: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Contacto</label><input className="form-control" value={form.contacto || ""} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Teléfono</label><input className="form-control" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="col-12"><label className="form-label small fw-semibold">Correo</label><input className="form-control" value={form.correo || ""} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
          </>
        )}
        {tipo === "atributos" && (
          <>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Subcategoría</label>
              <select className="form-select" value={form.subcategoria_id || ""} onChange={(e) => setForm({ ...form, subcategoria_id: e.target.value })}>
                <option value="">Seleccionar…</option>
                {subcategorias.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Tipo de dato</label>
              <select className="form-select" value={form.tipo_dato} onChange={(e) => setForm({ ...form, tipo_dato: e.target.value })}>
                <option value="TEXTO">Texto</option>
                <option value="NUMERO">Número</option>
                <option value="FECHA">Fecha</option>
                <option value="BOOLEANO">Sí/No</option>
              </select>
            </div>
            <div className="col-12 d-flex align-items-center gap-2">
              <input type="checkbox" id="reqAttr" checked={!!form.requerido} onChange={(e) => setForm({ ...form, requerido: e.target.checked })} />
              <label htmlFor="reqAttr" className="small">Obligatorio al registrar el activo</label>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}