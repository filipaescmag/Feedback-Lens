# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **PM-intern assignment from Cloudflare**, not a long-lived product. The full spec lives in `ASSIGNMENT.md` — read it before doing anything substantive. Summary:

- Build a prototype that aggregates and analyzes product feedback from many channels (support tickets, Discord, GitHub, email, X, forums) and surfaces themes / urgency / sentiment.
- **Deploy to Cloudflare Workers** (`*.workers.dev`) using **2–3 additional Cloudflare Developer Platform products**.
- Mock data is explicitly fine — no real third-party integrations.

## Grading reality (read this before optimizing)

The rubric is unusual and shapes every decision:

- **"Insights > polish."** A broken prototype with brilliant insights beats a polished prototype with no critique. Do not over-build.
- **Architecture rationale is graded.** The README must explain *why* each Cloudflare binding was chosen, not just *what* was used. Two well-justified bindings beats four token ones.

## Stack guidance

Reasonable default: **Workers + D1 + Workers AI + (KV *or* AI Search)**. Lean on AI Search only if the prototype really hinges on semantic clustering of similar feedback; otherwise KV is simpler.

Bindings live in `wrangler.jsonc` / `wrangler.toml`. Bootstrap with `npm create cloudflare@latest`. Deploy with `npx wrangler deploy`. Local dev with `npx wrangler dev`.

If Cloudflare's Docs MCP server is available, prefer it for live developer docs over training-data recall — the platform moves fast.

## Working rules specific to this repo

- **Mock data only.** Seed it in-repo or directly into D1. Do not wire real integrations (Discord API, GitHub API, etc.).

## Commands

No build system is committed yet. Once `npm create cloudflare@latest` has been run, the standard commands will be:

- `npx wrangler dev` — local dev server with bindings
- `npx wrangler deploy` — deploy to `*.workers.dev`
- `npx wrangler d1 execute <DB_NAME> --file=./schema.sql` — run a SQL file against D1 (use `--local` for local dev DB)
- `npx wrangler tail` — stream production logs

Update this section once the project is bootstrapped and the actual `package.json` scripts are known.
