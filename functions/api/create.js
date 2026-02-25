export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image'); 
    const title = formData.get('title') || "";
    const body = formData.get('body') || "";

    if (!imageFile || typeof imageFile === 'string') {
      return new Response("No image file", { status: 400 });
    }

    // 1. Upload to R2 (Binding name: MEDIA)
    const fileExt = imageFile.name.split('.').pop();
    const filename = `${crypto.randomUUID()}.${fileExt}`;
    
    await env.MEDIA.put(filename, imageFile.stream(), {
      httpMetadata: { contentType: imageFile.type }
    });

    const imageUrl = `https://paniba.us{filename}`;

    // 2. Save to D1 (Binding name: DB)
    await env.DB.prepare(`
      INSERT INTO posts (id, title, body, created_at, author_email, images_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      title,
      body,
      Date.now(),
      "admin@paniba.us",
      JSON.stringify([imageUrl]) 
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
