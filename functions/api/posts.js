export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, body, created_at, images_json FROM posts ORDER BY created_at DESC LIMIT 50"
  ).all();

  const posts = results.map(p => ({
    id: p.id,
    title: p.title,
    body: p.body,
    created_at: p.created_at,
    images: JSON.parse(p.images_json || "[]").map(key => `/api/media/${encodeURIComponent(key)}`)
  }));

  return Response.json(posts, { headers: { "Cache-Control": "no-store" } });
}
