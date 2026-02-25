export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Parse the incoming form data from your admin page
    const formData = await request.formData();
    const imageFile = formData.get('image'); 
    const title = formData.get('title') || "";
    const body = formData.get('body') || "";
    const authorEmail = formData.get('email') || "admin@paniba.us";

    // Basic Validation
    if (!imageFile || typeof imageFile === 'string') {
      return new Response("No image file uploaded", { status: 400 });
    }

    // 2. Generate a unique filename and upload to R2
    // We use crypto.randomUUID to prevent filename collisions
    const fileExtension = imageFile.name.split('.').pop();
    const filename = `${crypto.randomUUID()}.${fileExtension}`;

    // CRITICAL: We pass the contentType so R2 knows it's an image (png, jpg, etc.)
    await env.MEDIA.put(filename, imageFile.stream(), {
      httpMetadata: { 
        contentType: imageFile.type || 'image/jpeg' 
      }
    });

    // 3. Construct the public URL for the image
    // This assumes you have the [filename].js helper in functions/api/media/
    const imageUrl = `https://paniba.us{filename}`;

    // 4. Save metadata to D1 (Matching your exact schema)
    // We stringify the image URL into the images_json array format: ["url"]
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

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Post created successfully",
      url: imageUrl 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    // Returns the specific error (e.g., if DB or MEDIA bindings are missing)
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
}
