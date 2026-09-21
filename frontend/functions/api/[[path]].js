export async function onRequest(context) {
  const { request, env } = context;
  const backend = String(env.BACKEND_URL || "http://127.0.0.1:8500").replace(/\/+$/, "");
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "");
  const target = `${backend}/api${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const resp = await fetch(target, { method: request.method, headers, body });

  const out = new Headers();
  ["content-type", "content-length", "content-disposition", "cache-control"].forEach((k) => {
    const v = resp.headers.get(k);
    if (v) out.set(k, v);
  });
  return new Response(resp.body, { status: resp.status, headers: out });
}