const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("eticos_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("eticos_token", token);
  else localStorage.removeItem("eticos_token");
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("image/")) {
    return { status: res.status, blob: await res.blob() };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`);
    err.code = data?.code || "ERROR";
    err.status = res.status;
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent("eticos:logout"));
    }
    throw err;
  }
  return { status: res.status, data };
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),
  blob: (path) => request("GET", path),
};

export default api;

export function qrUrl(activoId) {
  return `${API_BASE}/activos/${activoId}/qr`;
}