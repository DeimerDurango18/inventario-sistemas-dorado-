import { useState } from "react";

export function PageHeader({ title, subtitle, icon, actions }) {
  return (
    <div className="eticos-page-header d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
      <div className="d-flex align-items-center gap-3">
        {icon && (
          <div className="eticos-page-icon">
            <i className={`bi bi-${icon}`}></i>
          </div>
        )}
        <div>
          <h4 className="mb-0 fw-bold">{title}</h4>
          {subtitle && <small className="text-secondary">{subtitle}</small>}
        </div>
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Card({ title, icon, actions, children, className = "", bodyClassName = "", header = true }) {
  return (
    <div className={`card eticos-card ${className}`}>
      {header && (
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            {icon && <i className={`bi bi-${icon} eticos-card-icon`}></i>}
            <span className="fw-semibold">{title}</span>
          </div>
          {actions && <div className="d-flex gap-1">{actions}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export function StatCard({ icon, label, value, color, sub, chip, onClick }) {
  return (
    <div
      className={`eticos-card lfo-kpi ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="lfo-chip" style={{ background: chip || `${color}18`, color }}>
        <i className={`bi bi-${icon}`}></i>
      </div>
      <div className="lfo-kpi-value">{value ?? "—"}</div>
      <div className="lfo-kpi-label">{label}</div>
      {sub && <div className="lfo-kpi-sub">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title = "Sin datos", hint }) {
  return (
    <div className="text-center py-5">
      <div className="eticos-empty-icon mb-2">
        <i className={`bi bi-${icon}`}></i>
      </div>
      <div className="fw-semibold">{title}</div>
      {hint && <small className="text-secondary">{hint}</small>}
    </div>
  );
}

export function LoadingBlock({ label = "Cargando…" }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-secondary">
      <div className="spinner-border spinner-border-sm eticos-spinner" role="status" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorAlert({ error, onClose }) {
  if (!error) return null;
  const msg = error?.message || String(error);
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between py-2 px-3">
      <div className="d-flex align-items-center gap-2">
        <i className="bi bi-exclamation-octagon-fill"></i>
        <span>{msg}</span>
      </div>
      {onClose && (
        <button className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar" />
      )}
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = "Confirmar", danger, confirmClass, busy, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="eticos-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="eticos-modal">
        <div className="eticos-modal-head">
          <h6 className="mb-0">{title}</h6>
          <button className="btn-close" onClick={() => !busy && onClose()} />
        </div>
        <div className="eticos-modal-body">{children ?? message}</div>
        <div className="eticos-modal-foot d-flex justify-content-end gap-2">
          <button className="btn btn-sm btn-light" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`btn btn-sm ${confirmClass || (danger ? "btn-danger" : "btn-brand")}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" /> Procesando…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Modal({ open, title, icon, size = "md", children, onClose, footer, width, busy }) {
  if (!open) return null;
  const sizes = { md: 480, lg: 720, xl: 940 };
  return (
    <div className="eticos-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="eticos-modal eticos-modal-lg" style={{ maxWidth: width || sizes[size] || sizes.md }}>
        <div className="eticos-modal-head">
          <div className="d-flex align-items-center gap-2">
            {icon && <i className={`bi bi-${icon}`}></i>}
            <h6 className="mb-0">{title}</h6>
          </div>
          <button className="btn-close" onClick={() => !busy && onClose()} />
        </div>
        <div className="eticos-modal-body">{children}</div>
        {footer && <div className="eticos-modal-foot d-flex justify-content-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Badge({ estado }) {
  const colors = {
    success: "#17b26a",
    warning: "#f79009",
    danger: "#eb3f5b",
    info: "#0ba5ec",
    primary: "#0b66c2",
    secondary: "#64748b",
    dark: "#1e293b",
  };
  const c = colors[estado?.cls] || colors.secondary;
  return (
    <span
      className="badge eta-badge"
      style={{ background: `${c}1c`, color: c, border: `1px solid ${c}40` }}
    >
      {estado?.label || estado}
    </span>
  );
}

export function useModalState() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
  };
}