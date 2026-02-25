export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image'); // Make sure your HTML input name is 'image'
    const caption = formData.get('caption') || "";

    if (!imageFile) return new Response("No image uploaded", { status: 400 });

    // 1. Generate a unique filename
    const filename = `${Date.now()}-${imageFile.name}`;

    // 2. Upload to R2
    await env.MY_BUCKET.put(filename, imageFile.stream(), {
      httpMetadata: { contentType: imageFile.type }
    });

    // 3. Save metadata to D1
    const imageUrl = `https://paniba.us{filename}`;
    await env.DB.prepare(
      "INSERT INTO posts (caption, image_url, created_at) VALUES (?, ?, ?)"
    ).bind(caption, imageUrl, new Date().toISOString()).run();

    return new Response(JSON.stringify({ success: true, url: imageUrl }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(`Upload failed: ${err.message}`, { status: 500 });
  }
}
