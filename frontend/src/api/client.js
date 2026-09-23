const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 30_000;

// La sesión no se persiste en disco: reduce el impacto de un token robado desde
// almacenamiento persistente del navegador. El backend sigue siendo la autoridad.
export function getToken() {
  return sessionStorage.getItem("eticos_token") || "";
}

export function setToken(token) {
  if (token) sessionStorage.setItem("eticos_token", token);
  else sessionStorage.removeItem("eticos_token");
  // Limpia tokens antiguos que pudieran haber quedado de versiones anteriores.
  localStorage.removeItem("eticos_token");
}

async function request(method, path, body, isForm = false) {
  const token = getToken();
  const headers = { Accept: "application/json" };
  if (!isForm) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("La solicitud tardó demasiado. Intenta nuevamente.");
    throw new Error("No se pudo conectar con el servidor.");
  } finally {
    clearTimeout(timeout);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const filename = parseFilename(res.headers.get("content-disposition"));
    if (!res.ok) {
      const err = new Error(`Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return { status: res.status, blob: await res.blob(), filename, contentType };
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`);
    err.code = data?.code || "ERROR";
    err.status = res.status;
    err.requestId = data?.request_id || res.headers.get("X-Request-ID");
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent("eticos:logout"));
    }
    throw err;
  }
  return { status: res.status, data };
}

function parseFilename(header) {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1].replace(/"/g, ""));
  const m = header.match(/filename="?([^";]+)"?/i);
  return m ? m[1] : null;
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
  blob: (path) => request("GET", path),
  upload: (path, file, fields = {}, onProgress) => {
    if (!file) return Promise.reject(new Error("No hay archivo seleccionado"));
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("archivo", file);
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      xhr.open("POST", `${API_BASE}${path}`);
      xhr.timeout = REQUEST_TIMEOUT_MS;
      const token = getToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch { /* respuesta no JSON */ }
        if (xhr.status >= 200 && xhr.status < 300) return resolve({ status: xhr.status, data });
        if (xhr.status === 401) {
          setToken(null);
          window.dispatchEvent(new CustomEvent("eticos:logout"));
        }
        const err = new Error(data?.message || `Error ${xhr.status}`);
        err.status = xhr.status;
        err.code = data?.code || "ERROR";
        reject(err);
      };
      xhr.onerror = () => reject(new Error("Error de red al subir el archivo"));
      xhr.ontimeout = () => reject(new Error("La carga tardó demasiado."));
      xhr.send(fd);
    });
  },
};

export default api;

export function qrUrl(activoId) {
  return `${API_BASE}/activos/${activoId}/qr`;
}

export async function downloadFile(path, fallbackName = "descarga") {
  const res = await request("GET", path);
  if (!res.blob) throw new Error("No se pudo descargar el archivo");
  const url = URL.createObjectURL(res.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.filename || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return res.filename || fallbackName;
}
