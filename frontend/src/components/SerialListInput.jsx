import { useState } from "react";

export default function SerialListInput({ value = [], onChange, placeholder = "Ingresa un serial y pulsa Enter o Agregar", allowPaste = true, disabled = false }) {
  const [texto, setTexto] = useState("");

  const normalizar = (raw) =>
    raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const agregar = () => {
    const nuevos = normalizar(texto);
    if (!nuevos.length) return;
    const unicos = [...new Set([...value, ...nuevos])];
    onChange(unicos);
    setTexto("");
  };

  const pegar = (e) => {
    if (!allowPaste) return;
    e.preventDefault();
    const pegado = normalizar(e.clipboardData.getData("text"));
    if (!pegado.length) return;
    onChange([...new Set([...value, ...pegado])]);
  };

  return (
    <div>
      <div className="d-flex gap-2">
        <input
          className="form-control form-control-sm"
          value={texto}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
          onPaste={pegar}
        />
        <button type="button" className="btn btn-sm btn-outline-brand text-nowrap" disabled={disabled || !texto.trim()} onClick={agregar}>
          <i className="bi bi-plus-lg me-1" /> Agregar
        </button>
      </div>
      {value.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {value.map((s, i) => (
            <span key={`${s}-${i}`} className="badge eta-badge d-inline-flex align-items-center gap-1" style={{ background: "#e9f2fc", color: "#0b66c2", border: "1px solid #0b66c240" }}>
              {s}
              <button type="button" className="border-0 bg-transparent p-0 lh-1" style={{ color: "inherit" }} disabled={disabled} title="Quitar serial" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <i className="bi bi-x"></i>
              </button>
            </span>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <small className="text-secondary d-block mt-1">
          {value.length} serial(es) registrado(s)
        </small>
      )}
    </div>
  );
}