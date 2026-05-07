// Workers AI helpers — embeddings + structured tagging.
// Model choices:
//   * @cf/baai/bge-base-en-v1.5 — 768-dim sentence embeddings. Fast, free-tier, matches our Vectorize index dims.
//   * @cf/meta/llama-3.1-8b-instruct — small, fast instruct model. JSON-mode capable, plenty for tagging.

const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";
const LABEL_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export type Sentiment = "positive" | "neutral" | "negative";
export type Urgency = "low" | "medium" | "high";

export interface FeedbackTags {
  sentiment: Sentiment;
  urgency: Urgency;
  theme: string;
}

/**
 * Embed a piece of feedback into a 768-dim vector for Vectorize.
 * The bge-base-en-v1.5 model returns { data: number[][] } — vector lives in data[0].
 */
export async function embed(ai: Ai, text: string): Promise<number[]> {
  const result = (await ai.run(EMBED_MODEL, { text: [text] })) as {
    data: number[][];
  };
  if (!result?.data?.[0]) {
    throw new Error("Workers AI embed returned no data");
  }
  return result.data[0];
}

/**
 * Ask the small Llama model to label a piece of feedback with sentiment / urgency / theme.
 * Uses JSON-mode (response_format) so we don't have to regex-parse free-form output.
 *
 * `theme` is intentionally short and lowercase-hyphenated (e.g. "cold-start-latency")
 * so we can group by it in SQL without further normalization.
 */
export async function tagFeedback(ai: Ai, text: string): Promise<FeedbackTags> {
  const system =
    "You categorize developer-tool product feedback. " +
    "Respond ONLY with JSON matching the schema. " +
    "Theme should be a short, lowercase-hyphenated phrase (3-5 words max) " +
    "describing the underlying topic, e.g. 'cold-start-latency' or 'billing-clarity'.";

  const result = (await ai.run(LABEL_MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          theme: { type: "string" },
        },
        required: ["sentiment", "urgency", "theme"],
      },
    },
  })) as { response?: string | Partial<FeedbackTags> };

  // Workers AI with `response_format: json_schema` returns the parsed object at
  // `result.response`. Older or non-schema modes return a JSON string there instead.
  // Handle both shapes.
  const parsed: Partial<FeedbackTags> =
    typeof result.response === "string"
      ? safeJsonParse(result.response)
      : (result.response ?? {});

  return {
    sentiment: (parsed.sentiment ?? "neutral") as Sentiment,
    urgency: (parsed.urgency ?? "low") as Urgency,
    theme: (parsed.theme ?? "uncategorized").trim().toLowerCase().replace(/\s+/g, "-"),
  };
}

/**
 * Given a small list of feedback excerpts that already cluster together,
 * produce a single human-readable theme label + 1-sentence summary.
 * Used by the dashboard to label each cluster.
 */
export async function summarizeCluster(
  ai: Ai,
  excerpts: string[],
): Promise<{ label: string; summary: string }> {
  const joined = excerpts
    .slice(0, 8)
    .map((e, i) => `${i + 1}. ${e}`)
    .join("\n");

  const result = (await ai.run(LABEL_MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You summarize product-feedback clusters for a PM dashboard. " +
          "Respond ONLY with JSON. `label` is a short title (3-6 words). " +
          "`summary` is one sentence (<=25 words) describing the shared concern.",
      },
      {
        role: "user",
        content: `These ${excerpts.length} feedback items cluster together. What is the shared concern?\n\n${joined}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        type: "object",
        properties: {
          label: { type: "string" },
          summary: { type: "string" },
        },
        required: ["label", "summary"],
      },
    },
  })) as { response?: string | { label?: string; summary?: string } };

  const parsed: { label?: string; summary?: string } =
    typeof result.response === "string"
      ? safeJsonParse(result.response)
      : (result.response ?? {});

  return {
    label: parsed.label?.trim() || "Unlabeled cluster",
    summary: parsed.summary?.trim() || "No summary available.",
  };
}

function safeJsonParse(s: string): Record<string, string> {
  try {
    // Some models wrap JSON in ```json ... ``` fences; strip them defensively.
    const stripped = s.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    return JSON.parse(stripped);
  } catch {
    return {};
  }
}
