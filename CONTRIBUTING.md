# Contributing

Thanks for helping out. This repository is the web UI; the analysis engine, CLI
and REST API live in
[cluster-guardian](https://github.com/cluster-guardian/cluster-guardian).

## Setup

Node 20+ (`.nvmrc` pins 22) and a `cluster-guardian` binary.

```sh
npm install
cluster-guardian serve --fixture e2e/fixtures/run1.json \
                       --fixture e2e/fixtures/run2.json \
                       --listen 127.0.0.1:8099
npm run dev
```

## Before opening a PR

```sh
npm run lint && npm run format && npm run typecheck && npm test
CG_BIN=../cluster-guardian/cluster-guardian npm run e2e
```

CI runs all of these plus `npm run design:build` and `npm audit`.

## Conventions

**Wire types mirror Go.** [src/api/types.ts](src/api/types.ts) is a field-for-field
mirror of `internal/report/model.go` and friends. Go marshals empty slices as
`null`, so lists are typed `T[] | null` and normalized once at the edge — don't
add per-use guards instead.

**Filtering stays pure.** [src/lib/filter.ts](src/lib/filter.ts) is a pure
transform over a report, the way the backend's checks are pure over a snapshot.
That is what makes it testable without a DOM. Keep view logic out of it.

**Colors are roles.** Reference tokens, never hex. If you need a new color, add
a token in [src/styles/tokens.css](src/styles/tokens.css) with both a light and a
dark step, chosen for their own surface rather than flipped.

**Severity is never color alone.** Every severity renders as a glyph plus the
word. Two of the severity colors sit below 3:1 on the light surface.

**Chart marks are validated, not chosen.** The mark set passed a lightness-band,
chroma-floor, CVD-separation and contrast check against the surfaces it renders
on. Critical↔warning sits inside the 6–8 CVD band on the dark surface, which is
only legal because the trend chart supplies secondary encoding: 2px surface gaps
between stacked fills, an always-present legend, labelled tooltips and a table
view. Changing a mark color, or dropping any of those four, means re-running the
validation — see the header comment in `tokens.css`.

**Every component gets a preview.** Add it to
[design/previews/](design/previews/) with a `@dsCard` marker on the first line.
`npm run design:build` wraps it in the app's real stylesheets, so the design
system cannot drift from the product.

## Tests

Unit tests cover the pure logic and component rendering. The Playwright suite
drives the production bundle against a real `serve --fixture`, so it catches
wire-format breakage that mocks would hide — prefer adding a case there over
mocking `fetch`.

`serve --fixture` is single-cluster only, so fleet views are covered by
component tests. Closing that gap needs a fleet fixture mode in the backend.
