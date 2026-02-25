export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image'); 
    const title = formData.get('title') || "";
    const body = formData.get('body') || "";
    const authorEmail = formData.get('email') || "admin@paniba.us";

    if (!imageFile) return new Response("Missing image", { status: 400 });

    // 1. Upload to R2
    const filename = `${crypto.randomUUID()}-${imageFile.name}`;
    await env.MY_BUCKET.put(filename, imageFile.stream(), {
      httpMetadata: { contentType: imageFile.type }
    });

    const imageUrl = `https://paniba.us{filename}`;

    // 2. Insert into D1 (matching your schema)
    // Note: We stringify the image URL into the images_json array
    await env.DB.prepare(`
      INSERT INTO posts (id, title, body, created_at, author_email, images_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      title,
      body,
      Date.now(),
      authorEmail,
      JSON.stringify([imageUrl]) 
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
