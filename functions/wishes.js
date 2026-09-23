export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Jika akses ke API /wishes
    if (path === "/wishes" || path === "/api/wishes") {
      try {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM wishes ORDER BY id DESC").all();
          return new Response(JSON.stringify(results), { headers: corsHeaders });
        }

        if (request.method === "POST") {
          const body = await request.json();
          const { name, message } = body;

          if (!name || !message) {
            return new Response(JSON.stringify({ error: "Nama dan pesan wajib diisi" }), { status: 400, headers: corsHeaders });
          }

          await env.DB.prepare("INSERT INTO wishes (name, message) VALUES (?, ?)")
            .bind(name, message)
            .run();

          return new Response(JSON.stringify({ success: true, message: "Ucapan berhasil dikirim" }), { headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Untuk file website statis lainnya, kembalikan dari asset binding Cloudflare
    return env.ASSETS.fetch(request);
  }
};
