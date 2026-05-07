-- 40 mock feedback items spanning 6 channels and ~5 latent themes.
-- Themes (NOT hard-coded — clustering should re-discover these):
--   T1 cold-start / latency on free tier
--   T2 D1 row-count + query-cost surprises
--   T3 Dashboard UX (binding setup, navigation)
--   T4 Billing / pricing transparency
--   T5 Docs / SDK gaps (esp. Workers AI + Vectorize)
-- Phrasing is intentionally varied so cosine similarity has real work to do.

-- T1 ---------------------------------------------------------------------
INSERT INTO feedback (channel, author, body) VALUES
  ('discord',  'pgrad_dan',     'Free tier workers are SLOW to wake up. 800ms cold start on the hello world example, what gives?'),
  ('twitter',  '@distsys_kate', 'Cloudflare Workers cold starts somehow worse than Lambda for me this week. anyone else seeing this?'),
  ('github',   'okrr-bot',      'Latency spike: P99 jumped from 40ms to 1.2s after deploy. No code change. Suspect cold start storm.'),
  ('support',  'eng-team-7',    'We are paying customers and our worker took 2 full seconds to respond at 3am. Unacceptable.'),
  ('forum',    'cf-newbie',     'Is there a way to keep my worker warm? I get hit once an hour and every request is sluggish.'),
  ('email',    'cto@startup.io','First request after idle period is unusably slow for our user-facing API.'),
  ('discord',  'maxxw',         'isolate cold start = 400ms on a hello world?? thought these were supposed to be instant'),
  ('twitter',  '@zen_eng',      'cold starts on @CloudflareDev workers are not as fast as the marketing implies imo'),

-- T2 ---------------------------------------------------------------------
  ('support',  'finance-acme',  'D1 query cost was 3x what we expected. Docs say 25M reads free but we hit billing at 18M.'),
  ('github',   'ash-w',         'D1 row read counter seems to count index lookups separately. Surprising.'),
  ('discord',  'lila_q',        'Just got my first D1 bill — $44 for what I thought was a free-tier-only side project. wat'),
  ('forum',    'haskeller99',   'Anyone else find D1 pricing impossible to estimate ahead of time? I dread shipping new queries now.'),
  ('email',    'pm@feedco.app', 'D1 metering surprised our finance team. We need predictable per-query cost.'),
  ('twitter',  '@dbgremlin',    '@CloudflareDev D1 free tier is generous but the meter is not visible until you blow through it.'),

-- T3 ---------------------------------------------------------------------
  ('support',  'newteam-ada',   'Dashboard binding config is super confusing. I have 3 environments and cannot tell which is which.'),
  ('discord',  'rebex',         'why are bindings under "Settings > Variables" in the dashboard but "compatibility flags" elsewhere? frustrating'),
  ('github',   'ui-issues-bot', 'Workers > Settings > Bindings page does not link to the relevant docs for each binding type.'),
  ('forum',    'cdfan',         'Spent 20 min looking for where to add a Vectorize binding in the UI. It is not under "Storage", which I expected.'),
  ('twitter',  '@uxpicky',      'cloudflare workers dashboard navigation is *not* intuitive. love the product, hate the IA.'),
  ('email',    'design-lead',   'Bindings page needs a search box. Scrolling through 40 R2 buckets to pick one is painful.'),
  ('discord',  'thom-c',        'real-talk: i deploy via wrangler so i never use the dashboard. the UI is a second-class citizen for power users'),

-- T4 ---------------------------------------------------------------------
  ('email',    'startup-cfo',   'We need a clearer breakdown of per-product costs in billing. Workers Paid + AI + D1 + R2 all show up as one line.'),
  ('forum',    'hobbyist42',    'I love that there is a free tier but I cannot tell when I am about to leave it. Wish there was a "tier projection" widget.'),
  ('support',  'enterprise-x',  'Our finance team rejected the invoice — it lists "Cloudflare Services" with no breakdown. This blocks renewal.'),
  ('twitter',  '@bootstrapper', 'cloudflare bills are mysterious. love the platform but our accountant cried at the line items.'),
  ('discord',  'ymir_p',        'is there a billing alert I can set per-product? I want to know if AI usage spikes specifically.'),

-- T5 ---------------------------------------------------------------------
  ('github',   'docs-issue-22', 'Workers AI docs show only `env.AI.run("@cf/meta/llama-3-8b")` but the new model id has a -instruct suffix. Confused for an hour.'),
  ('discord',  'ml_curious',    'the vectorize SDK docs do not show how to do *clustering*. only kNN search. had to figure it out from a blog post.'),
  ('forum',    'newdev2026',    'Workers AI tutorial uses an old model id. Followed it verbatim and got a 404. Took me 30 min to realize.'),
  ('support',  'devx-team',     'We need a single "Workers AI cookbook" page. Examples are scattered across docs, blog, and the playground.'),
  ('email',    'yan@studio.io', 'Vectorize quickstart does not mention dimension mismatch as a footgun. I built a 1024-dim index and bge is 768. Silent failure.'),
  ('twitter',  '@docs_pls',     'cloudflare docs are 90% great and 10% wildly out of date. the 10% always burns me.'),
  ('github',   'sdk-issue-8',   'TypeScript types for Ai binding do not include the streaming option overload. Had to cast to any.'),

-- Some general / mixed positive ones to make clustering interesting -----
  ('discord',  'happy_dev',     'Honestly Workers + D1 has been a delight. Deploy is fast, local dev mostly works, edges are fast.'),
  ('twitter',  '@cfphan',       'shipping a serverless app on cloudflare in an afternoon is a vibe. would recommend.'),
  ('forum',    'returning_dev', 'Coming back after a year — Workflows is a huge improvement, finally feels like a real platform for stateful apps.'),
  ('email',    'tlead@scaleco', 'Performance has been great for our edge use case. Just wish observability and billing were on the same level.'),
  ('support',  'stuck-user',    'Followed every step in the wrangler quickstart and got "binding not found" at runtime. No idea what I missed.'),
  ('discord',  'k8s_refugee',   'switching from EKS to Workers cut our infra bill 60%. cold start aside, this thing rules.'),
  ('github',   'qa-bot-2',      'Console.log output in `wrangler tail` sometimes lags by 20+ seconds vs. the dashboard log view. Inconsistent.');
