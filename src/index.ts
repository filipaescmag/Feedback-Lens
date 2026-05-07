// Worker entry — tiny router. We deliberately don't pull in Hono / itty-router etc.
// for a prototype with 6 endpoints; the standard URL pattern matching is plenty.

import { ingestOne, backfillUntagged, type FeedbackInput } from "./ingest";
import { buildClusters } from "./cluster";
import { renderDashboard } from "./ui";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // GET / — dashboard
      if (req.method === "GET" && path === "/") {
        const clusters = await buildClusters(env);
        const total = clusters.reduce((n, c) => n + c.size, 0);
        return html(renderDashboard(clusters, total));
      }

      // GET /api/clusters — JSON for the same data
      if (req.method === "GET" && path === "/api/clusters") {
        const clusters = await buildClusters(env);
        return json({
          clusters: clusters.map((c) => ({
            id: c.id,
            label: c.label,
            summary: c.summary,
            size: c.size,
            topUrgency: c.topUrgency,
            channels: c.channels,
            sentimentCounts: c.sentimentCounts,
            urgencyCounts: c.urgencyCounts,
            sampleIds: c.items.slice(0, 4).map((i) => i.id),
          })),
        });
      }

      // GET /api/feedback — raw rows
      if (req.method === "GET" && path === "/api/feedback") {
        const rows = await env.DB.prepare(
          "SELECT id, channel, author, body, sentiment, urgency, theme, created_at FROM feedback ORDER BY id DESC LIMIT 500",
        ).all();
        return json(rows.results);
      }

      // POST /api/ingest — accept new feedback (mock or real). Body: { channel, author, body }
      if (req.method === "POST" && path === "/api/ingest") {
        const body = (await req.json().catch(() => null)) as FeedbackInput | null;
        if (!body || !body.channel || !body.author || !body.body) {
          return json({ error: "channel, author, body are required" }, 400);
        }
        const id = await ingestOne(env, body);
        return json({ id }, 201);
      }

      // POST /admin/backfill — re-process untagged rows (used right after seeding the DB).
      // Calls itself recursively via the response; caller polls until remaining === 0.
      if (req.method === "POST" && path === "/admin/backfill") {
        const result = await backfillUntagged(env);
        return json(result);
      }

      // GET /healthz
      if (path === "/healthz") {
        return json({ ok: true });
      }

      // GET /favicon.ico — silence the browser's auto-fetch so it doesn't show
      // up as a console error. 204 No Content is cheaper than a real PNG.
      if (path === "/favicon.ico") {
        return new Response(null, {
          status: 204,
          headers: { "cache-control": "public, max-age=86400" },
        });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

function html(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=30",
    },
  });
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
