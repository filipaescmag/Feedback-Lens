// Server-rendered HTML dashboard. No client framework — single Worker response.
import type { Cluster } from "./cluster";

export function renderDashboard(clusters: Cluster[], totalCount: number): string {
  const grouped = clusters.filter((c) => c.size > 1);
  const singletons = clusters.filter((c) => c.size === 1);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Feedback Lens — themes across all channels</title>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">FL</div>
      <div>
        <h1>Feedback Lens</h1>
        <p class="tagline">Cluster-and-theme view of product feedback across channels.</p>
      </div>
    </div>
    <div class="stats">
      <div><strong>${totalCount}</strong><span>items</span></div>
      <div><strong>${grouped.length}</strong><span>themes</span></div>
      <div><strong>${singletons.length}</strong><span>outliers</span></div>
    </div>
  </header>

  <section>
    <h2>Themes <small>(2+ similar items)</small></h2>
    ${grouped.length === 0 ? `<p class="empty">No clusters formed yet — try ingesting more feedback.</p>` : ""}
    <div class="clusters">
      ${grouped.map(renderCluster).join("\n")}
    </div>
  </section>

  ${
    singletons.length > 0
      ? `<section>
           <h2>Outliers <small>(unique items the model couldn't group)</small></h2>
           <div class="outliers">
             ${singletons.map(renderSingleton).join("\n")}
           </div>
         </section>`
      : ""
  }

  <footer>
    <p>Built for Cloudflare PM Intern assignment — Workers + D1 + Workers AI + Vectorize.</p>
    <p><a href="https://github.com">source</a> · <a href="/api/clusters">JSON API</a> · <a href="/api/feedback">raw feedback</a></p>
  </footer>
</body>
</html>`;
}

function renderCluster(c: Cluster): string {
  const samples = c.items.slice(0, 4);
  const channelChips = Object.entries(c.channels)
    .sort((a, b) => b[1] - a[1])
    .map(([ch, n]) => `<span class="chip ch-${ch}">${ch} · ${n}</span>`)
    .join("");
  const sentimentBar = renderSentimentBar(c.sentimentCounts, c.size);

  return `<article class="cluster urgency-${c.topUrgency}">
    <header class="cluster-head">
      <h3>${escapeHtml(c.label)}</h3>
      <div class="badges">
        <span class="badge size">${c.size} items</span>
        <span class="badge urgency">urgency · ${c.topUrgency}</span>
      </div>
    </header>
    <p class="summary">${escapeHtml(c.summary)}</p>
    <div class="meta">
      <div class="channels">${channelChips}</div>
      ${sentimentBar}
    </div>
    <ul class="samples">
      ${samples
        .map(
          (s) =>
            `<li><span class="from">${escapeHtml(s.author)} <em>· ${escapeHtml(s.channel)}</em></span> "${escapeHtml(s.body)}"</li>`,
        )
        .join("")}
      ${c.size > samples.length ? `<li class="more">+ ${c.size - samples.length} more…</li>` : ""}
    </ul>
  </article>`;
}

function renderSingleton(c: Cluster): string {
  const item = c.items[0];
  return `<article class="outlier">
    <p class="outlier-body">"${escapeHtml(item.body)}"</p>
    <p class="outlier-meta">
      <span class="chip ch-${item.channel}">${escapeHtml(item.channel)}</span>
      <span class="muted">${escapeHtml(item.author)}</span>
      ${item.urgency ? `<span class="badge urgency">urgency · ${escapeHtml(item.urgency)}</span>` : ""}
      ${item.sentiment ? `<span class="badge sent-${item.sentiment}">${escapeHtml(item.sentiment)}</span>` : ""}
    </p>
  </article>`;
}

function renderSentimentBar(counts: Record<string, number>, total: number): string {
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const pos = pct(counts.positive ?? 0);
  const neu = pct(counts.neutral ?? 0);
  const neg = pct(counts.negative ?? 0);
  return `<div class="sentiment" title="positive ${pos}% · neutral ${neu}% · negative ${neg}%">
    <div class="seg pos" style="width:${pos}%"></div>
    <div class="seg neu" style="width:${neu}%"></div>
    <div class="seg neg" style="width:${neg}%"></div>
  </div>`;
}

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => escapeMap[c]);
}

const CSS = `
  :root {
    --bg: #0c0d10;
    --panel: #15171c;
    --panel-2: #1c1f26;
    --line: #262a33;
    --text: #e6e8ee;
    --muted: #8b93a3;
    --accent: #f6821f;       /* Cloudflare orange */
    --accent-soft: rgba(246, 130, 31, 0.12);
    --pos: #2dd4bf;
    --neu: #94a3b8;
    --neg: #f87171;
    --u-low: #475569;
    --u-med: #f59e0b;
    --u-high: #ef4444;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: radial-gradient(1100px 600px at 80% -10%, rgba(246,130,31,0.10), transparent 50%), var(--bg);
    color: var(--text);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
  }
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 28px 40px; border-bottom: 1px solid var(--line);
    flex-wrap: wrap; gap: 24px;
  }
  .brand { display: flex; align-items: center; gap: 16px; }
  .logo {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), #b65610);
    display: grid; place-items: center; font-weight: 800; color: #14110b; font-size: 16px;
    letter-spacing: -0.02em;
  }
  h1 { margin: 0; font-size: 22px; letter-spacing: -0.01em; }
  .tagline { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
  .stats { display: flex; gap: 12px; }
  .stats > div {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 10px 16px; min-width: 90px; text-align: center;
  }
  .stats strong { display: block; font-size: 22px; font-weight: 700; }
  .stats span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }

  section { padding: 24px 40px; max-width: 1280px; margin: 0 auto; }
  section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin: 0 0 16px; font-weight: 600; }
  section h2 small { color: #525968; font-weight: 400; text-transform: none; letter-spacing: 0; margin-left: 8px; font-size: 12px; }
  .empty { color: var(--muted); }

  .clusters { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
  .cluster {
    background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
    padding: 18px 18px 14px; position: relative; overflow: hidden;
    transition: transform .12s ease, border-color .12s ease;
  }
  .cluster:hover { transform: translateY(-1px); border-color: #2f343f; }
  .cluster::before {
    content: ""; position: absolute; inset: 0 0 auto 0; height: 3px;
  }
  .cluster.urgency-high::before  { background: var(--u-high); }
  .cluster.urgency-medium::before{ background: var(--u-med);  }
  .cluster.urgency-low::before   { background: var(--u-low);  }

  .cluster-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
  .cluster h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; letter-spacing: -0.005em; }
  .badges { display: flex; gap: 6px; flex-shrink: 0; }
  .badge {
    font-size: 11px; padding: 3px 8px; border-radius: 999px; background: var(--panel-2);
    border: 1px solid var(--line); color: var(--muted); white-space: nowrap;
  }
  .badge.urgency { color: var(--text); }
  .cluster.urgency-high  .badge.urgency { color: var(--u-high); border-color: var(--u-high); }
  .cluster.urgency-medium .badge.urgency { color: var(--u-med);  border-color: var(--u-med);  }
  .summary { color: #c9cdd6; margin: 6px 0 12px; }

  .meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .channels { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    font-size: 11px; padding: 3px 8px; border-radius: 999px; background: var(--panel-2);
    border: 1px solid var(--line); color: var(--muted);
  }
  .chip.ch-discord  { color: #a5b4fc; }
  .chip.ch-github   { color: #d8b4fe; }
  .chip.ch-support  { color: #fca5a5; }
  .chip.ch-twitter  { color: #7dd3fc; }
  .chip.ch-email    { color: #fcd34d; }
  .chip.ch-forum    { color: #6ee7b7; }

  .sentiment {
    flex: 1; min-width: 100px; height: 6px; border-radius: 4px; overflow: hidden;
    background: var(--panel-2); display: flex;
  }
  .seg.pos { background: var(--pos); }
  .seg.neu { background: var(--neu); }
  .seg.neg { background: var(--neg); }

  .samples { list-style: none; margin: 0; padding: 0; border-top: 1px dashed var(--line); padding-top: 10px; }
  .samples li {
    color: #c9cdd6; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed transparent;
  }
  .samples li + li { border-top: 1px dashed var(--line); }
  .samples .from { color: var(--muted); font-size: 11px; display: block; margin-bottom: 2px; }
  .samples .from em { font-style: normal; color: var(--accent); }
  .samples .more { color: var(--muted); font-size: 12px; text-align: center; padding-top: 8px; border: 0; }

  .outliers { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .outlier {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 12px 14px; font-size: 13px;
  }
  .outlier-body { color: #c9cdd6; margin: 0 0 8px; }
  .outlier-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0; }
  .muted { color: var(--muted); font-size: 11px; }
  .badge.sent-positive { color: var(--pos); }
  .badge.sent-neutral  { color: var(--neu); }
  .badge.sent-negative { color: var(--neg); }

  footer {
    padding: 32px 40px; max-width: 1280px; margin: 0 auto;
    color: var(--muted); font-size: 12px; border-top: 1px solid var(--line); margin-top: 24px;
  }
  footer p { margin: 4px 0; }
  footer a { color: var(--muted); text-decoration: none; border-bottom: 1px dotted var(--line); }
  footer a:hover { color: var(--accent); border-color: var(--accent); }
`;
