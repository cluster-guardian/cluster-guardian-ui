#!/usr/bin/env node
/**
 * Builds the Claude Design bundle from the app's own CSS.
 *
 * The point is that the design system cannot drift from the product: every
 * preview is wrapped with the real tokens.css and the real component
 * stylesheets, inlined. If a token changes in src/, the next `npm run
 * design:build` shows the change — there is no second copy to forget.
 *
 * Sources live in design/previews/*.html and hold body markup only. The first
 * line must be a `<!-- @dsCard group="…" title="…" -->` marker; the Design
 * System pane builds its card index from it.
 *
 * Output goes to design/dist/, which is gitignored — it is a build artifact,
 * uploaded by DesignSync, never edited by hand.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'design', 'previews');
const outDir = join(root, 'design', 'dist');

/** Every stylesheet the previews may reference, in cascade order. */
const STYLESHEETS = [
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/components/ui/ui.css',
  'src/components/shell/shell.css',
  'src/components/issues/issues.css',
  'src/routes/settings/settings.css',
  'src/components/DiffPanel.css',
  'src/components/ClusterCard.css',
  'src/components/TrendChart.css',
];

const CARD_RE = /^<!--\s*@dsCard\s+(.*?)\s*-->/;

function parseCard(line) {
  const m = line.match(CARD_RE);
  if (!m) return null;
  const attrs = {};
  for (const [, k, v] of m[1].matchAll(/(\w+)="([^"]*)"/g)) attrs[k] = v;
  return attrs;
}

async function main() {
  const css = (await Promise.all(STYLESHEETS.map((p) => readFile(join(root, p), 'utf8')))).join(
    '\n',
  );

  await rm(outDir, { recursive: true, force: true });
  // Previews sit under previews/ in the project, matching the finalized
  // DesignSync plan's `previews/*.html` glob.
  await mkdir(join(outDir, 'previews'), { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => f.endsWith('.html')).sort();
  if (files.length === 0) throw new Error(`no previews found in ${srcDir}`);

  const built = [];
  for (const file of files) {
    const raw = await readFile(join(srcDir, file), 'utf8');
    const [first, ...rest] = raw.split('\n');
    const card = parseCard(first);
    if (!card) {
      throw new Error(`${file}: first line must be a <!-- @dsCard group="…" title="…" --> marker`);
    }

    const body = rest.join('\n').trim();
    const html = `${first.trim()}
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>${card.title ?? file.replace(/\.html$/, '')} — Cluster Guardian</title>
    <style>
${css}
      /* Preview chrome: not part of the system, only the card's own frame. */
      body { padding: var(--space-5); background: var(--surface-page); }
      .ds-section { display: flex; flex-direction: column; gap: var(--space-3); }
      .ds-section + .ds-section { margin-top: var(--space-6); }
      .ds-label {
        font-size: var(--text-xs); text-transform: uppercase; letter-spacing: .06em;
        color: var(--ink-muted); font-weight: 600;
      }
      .ds-row { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; }
      .ds-note { font-size: var(--text-sm); color: var(--ink-secondary); max-width: 62ch; }
      .ds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: var(--space-3); }
      .ds-swatch { border-radius: var(--radius-md); border: 1px solid var(--line); overflow: hidden; }
      .ds-swatch__chip { height: 56px; }
      .ds-swatch__meta { padding: var(--space-2) var(--space-3); background: var(--surface-card); }
      .ds-swatch__name { font-size: var(--text-sm); font-weight: 600; }
      .ds-swatch__token { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--ink-muted); }
    </style>
  </head>
  <body>
${body}
  </body>
</html>
`;

    await writeFile(join(outDir, 'previews', file), html, 'utf8');
    built.push({ path: `previews/${file}`, ...card });
  }

  // Ship the raw tokens alongside the previews: a card shows what a role looks
  // like, this file is the copyable definition.
  await writeFile(join(outDir, 'tokens.css'), await readFile(join(root, STYLESHEETS[0]), 'utf8'));

  // A manifest for humans; the pane itself reads the @dsCard markers.
  await writeFile(join(outDir, 'index.json'), JSON.stringify({ cards: built }, null, 2) + '\n');

  console.log(`built ${built.length} previews into design/dist`);
  for (const c of built) console.log(`  ${c.group.padEnd(14)} ${c.title ?? c.path}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
