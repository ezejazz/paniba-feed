export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Parse the incoming form data
    const formData = await request.formData();
    const imageFile = formData.get('image'); // HTML input must be name="image"
    const title = formData.get('title') || "Untitled";
    const body = formData.get('body') || "";
    const authorEmail = formData.get('email') || "admin@paniba.us";

    // Validation
    if (!imageFile || typeof imageFile === 'string') {
      return new Response("No image file provided", { status: 400 });
    }

    // 2. Upload to R2 (using your 'MEDIA' binding)
    const fileExtension = imageFile.name.split('.').pop();
    const filename = `${crypto.randomUUID()}.${fileExtension}`;
    
    await env.MEDIA.put(filename, imageFile.stream(), {
      httpMetadata: { contentType: imageFile.type }
    });

    // 3. Construct the public URL for the image
    const imageUrl = `https://paniba.us{filename}`;

    // 4. Save metadata to D1 (using your 'DB' binding)
    await env.DB.prepare(`
      INSERT INTO posts (id, title, body, created_at, author_email, images_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      title,
      body,
      Date.now(),
      authorEmail,
      JSON.stringify([imageUrl]) // Store as a JSON array string
    ).run();

    return new Response(JSON.stringify({ success: true, url: imageUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    // This will catch binding errors (e.g., if 'DB' or 'MEDIA' are missing)
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
}
