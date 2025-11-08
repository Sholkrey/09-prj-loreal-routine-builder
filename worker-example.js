// Cloudflare Worker example (save as src/index.js in your Worker project)
// - Stores OPENAI_API_KEY as a secret binding: wrangler secret put OPENAI_API_KEY
// - Optionally enable web search via a secondary API (BRAVE_API_KEY or similar)
// - Expects requests from the front-end with { messages, selected }
// - Returns OpenAI-compatible JSON with choices[0].message.content

export default {
  async fetch(request, env) {
    // Basic CORS handling
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const selected = Array.isArray(body.selected) ? body.selected : [];

    const systemPreamble = {
      role: "system",
      content: `You are a helpful beauty advisor for L'Oréal brands. Only discuss skincare, haircare, makeup, fragrance, and related routines. If the user asks about unrelated topics, politely redirect. Use the provided selected products JSON to tailor your routine and advice. Keep answers concise and safe.`,
    };

    // Inject selected products as context
    const selectionContext = selected.length
      ? [
          {
            role: "system",
            content: `Selected products JSON:\n${JSON.stringify(
              selected,
              null,
              2
            )}`,
          },
        ]
      : [];

    const finalMessages = [systemPreamble, ...selectionContext, ...messages];

    // Optional: Add web search step for extra credit if env.BRAVE_API_KEY is present
    let webContext = "";
    if (env.BRAVE_API_KEY && body.enableWebSearch) {
      // Minimal example using Brave Search API for real-time info
      // NOTE: On free tiers you might need to adapt endpoints/params.
      try {
        const q =
          "site:loreal.com OR site:lancome-usa.com OR site:maybelline.com skincare haircare routine latest products";
        const br = await fetch(
          "https://api.search.brave.com/res/v1/web/search?q=" +
            encodeURIComponent(q),
          {
            headers: { "X-Subscription-Token": env.BRAVE_API_KEY },
          }
        );
        if (br.ok) {
          const jd = await br.json();
          const hits =
            jd.web && jd.web.results ? jd.web.results.slice(0, 3) : [];
          webContext = hits.map((h) => `- ${h.title} — ${h.url}`).join("\n");
        }
      } catch (_) {}
    }

    if (webContext) {
      finalMessages.unshift({
        role: "system",
        content: `Current references (may include external links):\n${webContext}`,
      });
    }

    // Call OpenAI (no SDK)
    try {
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: finalMessages,
            temperature: 0.6,
          }),
        }
      );

      const data = await openaiRes.json();
      if (!openaiRes.ok) {
        return new Response(JSON.stringify(data), {
          status: openaiRes.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Return as-is (front-end expects choices[0].message.content)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};
