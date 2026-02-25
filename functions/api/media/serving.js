export async function onRequestGet(context) {
  const filename = context.params.filename;
  const object = await context.env.MY_BUCKET.get(filename);

  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Access-Control-Allow-Origin", "*");
  
  return new Response(object.body, { headers });
}
