import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), []);

  const pushToast = useCallback(
    (type, message) => {
      const tid = ++idRef.current;
      setToasts((t) => [...t, { id: tid, type: type || "success", message }]);
      window.setTimeout(() => dismiss(tid), 4500);
    },
    [dismiss]
  );

  const icon =
    "bi-check-circle-fill bi-x-circle-fill bi-exclamation-triangle-fill bi-info-circle-fill";

  return (
    <ToastCtx.Provider value={{ pushToast }}>
      {children}
      <div className="eticos-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`eticos-toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            <i className={`bi ${icon.split(" ")[["success", "error", "warning", "info"].indexOf(t.type)]}`} />
            <span className="flex-grow-1">{t.message}</span>
            <i className="bi bi-x-lg"></i>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx || { pushToast: () => {} };
}