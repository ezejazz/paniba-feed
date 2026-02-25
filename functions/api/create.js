export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const imageFiles = formData.getAll('images'); // 'getAll' picks up the 'multiple' files
    const title = formData.get('title') || "";
    const body = formData.get('body') || "";

    const imageUrls = [];

    // Loop through every image in the album
    for (const file of imageFiles) {
      if (file && typeof file !== 'string') {
        const filename = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
        
        // Upload to R2
        await env.MEDIA.put(filename, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        imageUrls.push(`https://paniba.us{filename}`);
      }
    }

    // Save the array of URLs to D1
    await env.DB.prepare(`
      INSERT INTO posts (id, title, body, created_at, author_email, images_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      title,
      body,
      Date.now(),
      "admin@paniba.us",
      JSON.stringify(imageUrls) // Saves as ["url1", "url2"]
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
