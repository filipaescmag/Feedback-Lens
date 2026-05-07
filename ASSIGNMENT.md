# Cloudflare PM Intern Assignment

## Mission
Build a prototype that **aggregates and analyzes product feedback** scattered across many channels (Support tickets, Discord, GitHub issues, email, X/Twitter, community forums) so a PM can extract **themes, urgency, value, and sentiment** from the noise.

> **Core philosophy:** A broken prototype with a brilliant product critique beats a perfect prototype with no feedback. **Insights > polish.**

---

## Build Challenge

### Hard Requirements
1. **Deploy to Cloudflare Workers** → final URL like `your-project.account.workers.dev`
2. **Use 2–3 additional Cloudflare Developer Platform products** (strongly preferred, not optional in spirit)
3. **Mock data is fine** — no real third-party integrations needed
4. **Produce a short architecture overview** explaining product choices and rationale

### Form Factor — Open
Cloudflare explicitly mentions all of these as valid directions:
- Dashboard showing aggregated feedback
- AI agent that reports results
- Workflow that posts daily summaries to Slack/Discord
- Something more unconventional

There is **no single right answer**. The thinking is what's evaluated.

### Cloudflare Products — Reference Table
| Product | Why it fits this challenge |
|---|---|
| **Workers** *(required)* | Hosts the app |
| **Workers AI** | Llama 3 etc. for summarization, sentiment, theme extraction |
| **Workflows** | Multi-step stateful pipelines (Receive → Analyze → Notify) |
| **D1** | Serverless SQL — structured feedback rows |
| **AI Search** | Managed RAG / semantic search — cluster similar complaints |
| **KV** | Eventually-consistent KV store — configs, fast aggregate reads |
| **R2** | Object storage — raw payloads, attachments, PDFs |

**Reasonable default stack:** Workers + D1 + Workers AI + (KV *or* AI Search). Swap to AI Search if the prototype leans on semantic clustering of similar feedback.

### Getting Started
```bash
# Bootstrap
npm create cloudflare@latest

# Run a coding agent inside the project (Claude Code, opencode, etc.)

# Deploy when ready
npx wrangler deploy
```
Bindings to other CF products are configured in `wrangler.jsonc` / `wrangler.toml`.

**Pro tip:** Connect the coding agent to **Cloudflare's Docs MCP server** so it can pull live developer docs while building.
