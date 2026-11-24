/**
 * Renders every exercise's form illustration (start → finish) to reports/figure-sheet.html
 * for visual review:  npm run figures:sheet
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG } from "../src/lib/catalog";
import { FIGURE_VIEWBOX, FigureFrame, figureFor } from "../src/components/exercise-figure";

const cells = CATALOG.map((e) => {
  const f = figureFor(e.slug);
  const frame = (t: number) => (f ? <svg viewBox={FIGURE_VIEWBOX} width={120} height={120}><FigureFrame template={f.template} weight={f.weight} t={t} /></svg> : <div style={{ width: 120, height: 120, color: "red" }}>missing</div>);
  return (
    <div key={e.slug} className="cell">
      <div className="frames">{frame(0)}{frame(0.5)}{frame(1)}</div>
      <div className="name">{e.name}</div>
    </div>
  );
});

const html = `<!doctype html><html data-theme="${process.argv[2] ?? "dark"}"><head><meta charset="utf-8"><style>
[data-theme=dark]{--bg:#0a0a0a;--text:#f5f5f4;--muted:#8b8b89;--accent:#ffd60a;--border-strong:rgb(255 255 255/.16);--s:#1e1e1e}
[data-theme=light]{--bg:#f6f5f1;--text:#111;--muted:#64645f;--accent:#ffd60a;--border-strong:rgb(0 0 0/.16);--s:#f0efea}
body{background:var(--bg);color:var(--text);font:12px system-ui;margin:12px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cell{background:var(--s);border-radius:10px;padding:6px}
.frames{display:flex;gap:2px}.name{margin-top:2px}</style></head><body><div class="grid">${renderToStaticMarkup(<>{cells}</>)}</div></body></html>`;

mkdirSync("reports", { recursive: true });
writeFileSync("reports/figure-sheet.html", html);
console.log("Wrote reports/figure-sheet.html");
