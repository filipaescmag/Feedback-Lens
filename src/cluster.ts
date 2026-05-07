// Clustering — the product's "magic" step.
//
// Algorithm: greedy threshold agglomeration over Vectorize.
//   For each unassigned item:
//     - query Vectorize for its top-K nearest neighbours
//     - absorb every neighbour scoring >= SIM_THRESHOLD into the same cluster
//     - mark all of them assigned, move on
//
// We pick this over k-means because:
//   1. We don't know k ahead of time (the whole point is "discover the themes").
//   2. Vectorize gives us nearest-neighbour queries cheaply; it does NOT give us
//      a built-in clustering primitive.
//   3. Threshold-based grouping naturally handles "outlier" feedback that doesn't
//      fit any cluster — they end up as singletons we can show separately.

import { summarizeCluster } from "./ai";

const SIM_THRESHOLD = 0.78; // cosine similarity in [-1, 1] for bge-base
const TOPK = 20;            // upper bound on cluster size we'll fetch per query

export interface FeedbackRow {
  id: number;
  channel: string;
  author: string;
  body: string;
  sentiment: string | null;
  urgency: string | null;
  theme: string | null;
}

export interface Cluster {
  id: string;                    // synthetic — "c1", "c2", ...
  label: string;                 // human-readable from AI
  summary: string;               // 1-sentence shared concern
  size: number;
  items: FeedbackRow[];
  channels: Record<string, number>;
  sentimentCounts: Record<string, number>;
  urgencyCounts: Record<string, number>;
  topUrgency: "low" | "medium" | "high";
}

export async function buildClusters(env: Env): Promise<Cluster[]> {
  const allRows = await env.DB.prepare(
    "SELECT id, channel, author, body, sentiment, urgency, theme FROM feedback WHERE vector_id IS NOT NULL ORDER BY id",
  ).all<FeedbackRow>();

  const byId = new Map<number, FeedbackRow>();
  for (const row of allRows.results) byId.set(row.id, row);

  const assigned = new Set<number>();
  const rawClusters: FeedbackRow[][] = [];

  for (const row of allRows.results) {
    if (assigned.has(row.id)) continue;

    // Re-fetch the vector for this row from Vectorize via getByIds — saves a re-embed.
    const fetched = await env.FEEDBACK_INDEX.getByIds([String(row.id)]);
    const seedVector = fetched[0]?.values;
    if (!seedVector) {
      // No vector — treat as singleton outlier.
      rawClusters.push([row]);
      assigned.add(row.id);
      continue;
    }

    const matches = await env.FEEDBACK_INDEX.query(seedVector, {
      topK: TOPK,
      returnValues: false,
      returnMetadata: "none",
    });

    const cluster: FeedbackRow[] = [];
    for (const m of matches.matches) {
      const matchedId = Number(m.id);
      if (assigned.has(matchedId)) continue;
      if (m.score < SIM_THRESHOLD && cluster.length > 0) continue;
      const matchedRow = byId.get(matchedId);
      if (!matchedRow) continue;
      cluster.push(matchedRow);
      assigned.add(matchedId);
    }

    if (cluster.length === 0) {
      cluster.push(row);
      assigned.add(row.id);
    }
    rawClusters.push(cluster);
  }

  // Order by descending size — biggest concerns first, the way a PM would want to read.
  rawClusters.sort((a, b) => b.length - a.length);

  // Label and summarize each cluster. Singletons skip the AI call to save tokens.
  const labeled: Cluster[] = [];
  for (let i = 0; i < rawClusters.length; i++) {
    const items = rawClusters[i];
    const id = `c${i + 1}`;

    const channels: Record<string, number> = {};
    const sentimentCounts: Record<string, number> = {};
    const urgencyCounts: Record<string, number> = { low: 0, medium: 0, high: 0 };
    for (const item of items) {
      channels[item.channel] = (channels[item.channel] ?? 0) + 1;
      if (item.sentiment) sentimentCounts[item.sentiment] = (sentimentCounts[item.sentiment] ?? 0) + 1;
      if (item.urgency) urgencyCounts[item.urgency] = (urgencyCounts[item.urgency] ?? 0) + 1;
    }
    const topUrgency: "low" | "medium" | "high" =
      urgencyCounts.high > 0 ? "high" : urgencyCounts.medium > 0 ? "medium" : "low";

    let label: string, summary: string;
    if (items.length === 1) {
      label = items[0].theme ? prettifyTheme(items[0].theme) : "Singleton feedback";
      summary = items[0].body.length > 120 ? items[0].body.slice(0, 117) + "..." : items[0].body;
    } else {
      const out = await summarizeCluster(env.AI, items.map((i) => i.body));
      label = out.label;
      summary = out.summary;
    }

    labeled.push({
      id,
      label,
      summary,
      size: items.length,
      items,
      channels,
      sentimentCounts,
      urgencyCounts,
      topUrgency,
    });
  }

  return labeled;
}

function prettifyTheme(theme: string): string {
  return theme
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
