# Feedback Lens

Cluster product feedback from many channels into themes. Built for the Cloudflare PM Intern Summer 2026 take-home.

**Live demo:** https://feedback-lens.filipaescmag.workers.dev/

---

## What it does

Ingests feedback rows (Discord, GitHub, support tickets, X, email, forums), embeds each one with Workers AI, and uses Vectorize to group items that say the same thing. The dashboard shows themes sized by volume and coloured by urgency, instead of a raw firehose. The same bug reported on three channels collapses into one cluster.

---

## Architecture

Single Worker handles routing, ingest, clustering, and HTML rendering. Three Cloudflare bindings.

**D1** — feedback rows. Picked over KV because the dashboard needs `WHERE` filters (channel / theme / urgency), `RETURNING id` after insert (to key the matching Vectorize entry), and scans for un-tagged rows during backfill.

**Workers AI** — embeddings (`@cf/baai/bge-base-en-v1.5`, 768-dim) and per-item tagging (`@cf/meta/llama-3.1-8b-instruct` with JSON-schema response). One binding, two model calls, no external API keys.

**Vectorize** — 768-dim cosine index. Picked over AI Search (which the assignment table suggested) because the task is raw similarity grouping, not RAG-style retrieval.

### Not used (deliberately)

- **KV** — only useful for caching cluster output; would be a fourth binding for shallow gain.
- **Workflows** — overkill for synchronous ingest at prototype scale; right answer for nightly digests later.
- **R2** — no large-blob payloads in feedback yet.

### Clustering

Greedy threshold-based agglomeration over `Vectorize.query()`:

```
seen ← ∅
for row ordered by id:
  if row.id ∈ seen: continue
  matches ← Vectorize.query(vec[row.id], topK=20)
  cluster ← matches up to first score < 0.78
  seen += cluster ids
  emit cluster
```

`k` is unknown (the task is "tell me what themes exist"), and Vectorize has no built-in cluster call. Threshold 0.78 was empirically tuned for `bge-base`: paraphrases score 0.85+, loosely related items fall below 0.7. Per-cluster label and summary come from one Llama call; singletons skip it.

---

## Endpoints

| Method | Path              | Purpose                                                   |
|--------|-------------------|-----------------------------------------------------------|
| GET    | `/`               | HTML dashboard                                            |
| GET    | `/api/clusters`   | Clusters with size, label, summary, channel mix           |
| GET    | `/api/feedback`   | Raw feedback rows                                         |
| POST   | `/api/ingest`     | `{channel, author, body}` — ingest + embed + tag + upsert |
| POST   | `/admin/backfill` | Process a batch of un-tagged rows (after seeding)         |
| GET    | `/healthz`        | Liveness                                                  |

---

## Setup

Requires a Cloudflare account with Workers Paid (needed for Vectorize).

```bash
npx wrangler login
npm install

npm run db:create        # prints a database UUID — paste into wrangler.jsonc
npm run vec:create

npm run db:schema:remote
npm run db:seed:remote
npm run deploy

# Repeat until "remaining": 0
curl -X POST https://feedback-lens.filipaescmag.workers.dev/admin/backfill
```

### Local dev

```bash
npm run db:schema:local
npm run db:seed:local
npm run dev    # http://localhost:8787
curl -X POST http://localhost:8787/admin/backfill
```

Vectorize has no local emulator — `wrangler dev` proxies Vectorize calls to the remote index, which costs Workers AI quota during local dev.

---

## Notes

- TypeScript, ESM, server-rendered HTML, no client framework.
- Embedding dim and Vectorize index dim must match (768). Hard-coded in `wrangler.jsonc` and the embed call — mismatches fail silently at query time.
- Independent async ops (`embed` + `tagFeedback`, `embed` + `upsert` + `update`) run in `Promise.all`. The Llama call dominates wall-time.
