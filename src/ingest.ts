// Ingest pipeline:
//   1. Insert raw row into D1 (so we have a stable id even if AI fails)
//   2. Run Workers AI to get sentiment / urgency / theme + embedding (in parallel)
//   3. Upsert vector into Vectorize keyed by the row's id
//   4. Update the D1 row with AI tags + vector_id
//
// Steps 2-4 are deliberately separate from step 1 so a partial AI failure
// still leaves the raw feedback queryable in D1.

import { embed, tagFeedback } from "./ai";

export interface FeedbackInput {
  channel: string;
  author: string;
  body: string;
}

export async function ingestOne(env: Env, input: FeedbackInput): Promise<number> {
  const insert = await env.DB.prepare(
    "INSERT INTO feedback (channel, author, body) VALUES (?, ?, ?) RETURNING id",
  )
    .bind(input.channel, input.author, input.body)
    .first<{ id: number }>();

  if (!insert) throw new Error("D1 insert returned no id");
  const id = insert.id;

  // Run embedding + tagging in parallel — they're independent and the slow path is the model call.
  const [vector, tags] = await Promise.all([
    embed(env.AI, input.body),
    tagFeedback(env.AI, input.body),
  ]);

  await env.FEEDBACK_INDEX.upsert([
    {
      id: String(id),
      values: vector,
      metadata: {
        channel: input.channel,
        theme: tags.theme,
        sentiment: tags.sentiment,
        urgency: tags.urgency,
      },
    },
  ]);

  await env.DB.prepare(
    "UPDATE feedback SET sentiment = ?, urgency = ?, theme = ?, vector_id = ? WHERE id = ?",
  )
    .bind(tags.sentiment, tags.urgency, tags.theme, String(id), id)
    .run();

  return id;
}

/**
 * Backfill: process every row in `feedback` that doesn't yet have AI tags.
 * Called by the /admin/backfill endpoint after seeding the DB.
 *
 * Workers have a CPU/wall-time budget per request, so we process in small batches
 * and return progress info — the caller can poll until done.
 */
export async function backfillUntagged(env: Env, batchSize = 8): Promise<{
  processed: number;
  remaining: number;
}> {
  const rows = await env.DB.prepare(
    "SELECT id, channel, author, body FROM feedback WHERE sentiment IS NULL ORDER BY id LIMIT ?",
  )
    .bind(batchSize)
    .all<{ id: number; channel: string; author: string; body: string }>();

  for (const row of rows.results) {
    const [vector, tags] = await Promise.all([
      embed(env.AI, row.body),
      tagFeedback(env.AI, row.body),
    ]);
    await env.FEEDBACK_INDEX.upsert([
      {
        id: String(row.id),
        values: vector,
        metadata: {
          channel: row.channel,
          theme: tags.theme,
          sentiment: tags.sentiment,
          urgency: tags.urgency,
        },
      },
    ]);
    await env.DB.prepare(
      "UPDATE feedback SET sentiment = ?, urgency = ?, theme = ?, vector_id = ? WHERE id = ?",
    )
      .bind(tags.sentiment, tags.urgency, tags.theme, String(row.id), row.id)
      .run();
  }

  const remaining = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM feedback WHERE sentiment IS NULL",
  ).first<{ n: number }>();

  return {
    processed: rows.results.length,
    remaining: remaining?.n ?? 0,
  };
}
