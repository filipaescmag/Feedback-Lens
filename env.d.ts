// Bindings exposed on `env` — keep in sync with wrangler.jsonc.
interface Env {
  DB: D1Database;
  FEEDBACK_INDEX: VectorizeIndex;
  AI: Ai;
}
