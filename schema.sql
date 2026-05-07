-- Feedback Lens — D1 schema.
-- One table is enough for a prototype: every piece of feedback is a row,
-- with raw text + the channel it came from + AI-derived enrichment columns
-- (filled in lazily by the ingest pipeline).

DROP TABLE IF EXISTS feedback;

CREATE TABLE feedback (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  channel       TEXT NOT NULL,                  -- 'discord' | 'github' | 'support' | 'twitter' | 'email' | 'forum'
  author        TEXT NOT NULL,
  body          TEXT NOT NULL,
  sentiment     TEXT,                           -- 'positive' | 'neutral' | 'negative' (filled by Workers AI)
  urgency       TEXT,                           -- 'low' | 'medium' | 'high' (filled by Workers AI)
  theme         TEXT,                           -- short AI-generated theme tag (e.g. 'cold-start-latency')
  vector_id     TEXT,                           -- matches the id we stored in Vectorize
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_feedback_channel  ON feedback(channel);
CREATE INDEX idx_feedback_theme    ON feedback(theme);
CREATE INDEX idx_feedback_urgency  ON feedback(urgency);
