const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // POST /click?slug=xxx — increment click count
    if (request.method === "POST" && url.pathname === "/click") {
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return new Response(JSON.stringify({ error: "slug required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const current = parseInt((await env.CLICKS.get(slug)) || "0", 10);
      await env.CLICKS.put(slug, String(current + 1));

      return new Response(JSON.stringify({ slug, count: current + 1 }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // GET /hot — return top N slugs by click count
    if (request.method === "GET" && url.pathname === "/hot") {
      const n = parseInt(url.searchParams.get("n") || "3", 10);

      // List all keys and their values
      const list = await env.CLICKS.list();
      const counts = [];

      for (const key of list.keys) {
        const val = parseInt((await env.CLICKS.get(key.name)) || "0", 10);
        counts.push({ slug: key.name, count: val });
      }

      // Sort by count descending, take top N
      counts.sort((a, b) => b.count - a.count);
      const top = counts.slice(0, n);

      return new Response(JSON.stringify(top), {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // GET /all — return all counts (for debugging)
    if (request.method === "GET" && url.pathname === "/all") {
      const list = await env.CLICKS.list();
      const counts = [];

      for (const key of list.keys) {
        const val = parseInt((await env.CLICKS.get(key.name)) || "0", 10);
        counts.push({ slug: key.name, count: val });
      }

      counts.sort((a, b) => b.count - a.count);

      return new Response(JSON.stringify(counts), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};
