function requireAccessEmail(request) {
  // Cloudflare Access adds this header when the route is protected
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}

export async function onRequestPost({ env, request }) {
  const email = requireAccessEmail(request);
  if (!email) return new Response("Forbidden (Access required)", { status: 403 });

  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "").trim();
  const files = form.getAll("images").filter(v => v instanceof File);

  if (!title && !body && files.length === 0) {
    return new Response("Add text or images.", { status: 400 });
  }

  const postId = crypto.randomUUID();
  const createdAt = Date.now();
  const keys = [];

  for (const file of files) {
    const safeName = (file.name || "image").replace(/[^\w.\-]+/g, "_");
    const key = `posts/${postId}/${Date.now()}_${safeName}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" }
    });
    keys.push(key);
  }

  await env.DB.prepare(
    "INSERT INTO posts (id, title, body, created_at, author_email, images_json) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(postId, title, body, createdAt, email, JSON.stringify(keys))
    .run();

  return Response.json({ ok: true, id: postId });
}
