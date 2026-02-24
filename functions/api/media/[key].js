export async function onRequestGet({ env, params }) {
  const key = params.key;
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(obj.body, { headers });
}
