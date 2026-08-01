<p align="center">
  <img src="public/favicon.svg" alt="Cluster Guardian logo" width="96">
</p>

# Cluster Guardian UI

[![CI][ci-badge]][ci-url]
[![Release][release-badge]][release-url]
[![Image][image-badge]][image-url]
[![License: MIT][license-badge]][license-url]

[ci-badge]: https://github.com/cluster-guardian/cluster-guardian-ui/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/cluster-guardian/cluster-guardian-ui/actions/workflows/ci.yml
[release-badge]: https://img.shields.io/github/v/release/cluster-guardian/cluster-guardian-ui?include_prereleases
[release-url]: https://github.com/cluster-guardian/cluster-guardian-ui/releases
[image-badge]: https://img.shields.io/badge/ghcr.io-cluster--guardian--ui-blue
[image-url]: https://github.com/cluster-guardian/cluster-guardian-ui/pkgs/container/cluster-guardian-ui
[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg
[license-url]: LICENSE

The web dashboard for
[cluster-guardian](https://github.com/cluster-guardian/cluster-guardian) — a
fleet scorecard, per-cluster findings, severity trends and run-over-run diffs,
served from the analyzer's REST API.

The Go binary now serves JSON only — its embedded dashboard was removed — so
this repository is the UI. That change is on `cluster-guardian`'s `main` and is
not in a release yet, which is why CI here builds the backend from source rather
than downloading one.

```
┌ Cluster Guardian ──── Fleet │ Issues │ Settings ───── astriletskyi ADMIN ┐
├───────────────┬─────────────────────────────────────────────────────────┤
│  F  34/100    │  Fleet › prod-eu › Issues                               │
│  Health score │                                                          │
│               │  Filters        ✕ CRITICAL  2 privileged containers      │
│  Overview     │  ☑ Critical  1  ! WARNING   web uses :latest tag        │
│  Issues   11  │  ☑ Warning  10  ! WARNING   2 Pods missing requests     │
│               │  ☐ Info     11  ℹ INFO      Missing HPA                 │
│  SETTINGS     │  ☐ security  7                                          │
│  Preferences  │  ☐ shop      8                                          │
│  Access       │                                                          │
│  Clusters     │                                                          │
│  Teams        │                                                          │
└───────────────┴─────────────────────────────────────────────────────────┘
```

## Status

| Area                    | State | Notes                                                                                  |
| ----------------------- | :---: | -------------------------------------------------------------------------------------- |
| App shell               |  ✅   | Global nav, contextual sidebar with live counts, breadcrumbs, drawer below 960px       |
| Cluster overview        |  ✅   | Score, summary, trend, run diff, per-area table linking into filtered issues           |
| Issues page             |  ✅   | Every finding in one list, faceted by severity / area / namespace / team / compliance  |
| Faceted counts          |  ✅   | Each count computed against the _other_ facets, so it never promises an empty result   |
| Trend chart             |  ✅   | Stacked area over `/api/history`, with a table view and a labelled tooltip             |
| Run-over-run diff       |  ✅   | New and resolved findings from `/api/history/diff`, collapsed when long                |
| Fleet overview          |  ✅   | Scorecard grid from `/api/clusters`, sortable, failed scans surfaced and pinned to top |
| Identity & roles        |  ✅   | `/api/me` drives every control; viewer / operator / admin, from proxy headers          |
| Settings › Clusters     |  ✅   | Register and remove clusters (admin, needs `--admin-api`)                              |
| Settings › Teams        |  ✅   | Edit namespace ownership (operator, needs `--teams-configmap`)                         |
| Settings › Access       |  ✅   | Who you are, what you may do, and why something is unavailable                         |
| Settings › Preferences  |  ✅   | Default severities, auto-refresh, landing page, density, remediation — per browser     |
| Mode auto-detection     |  ✅   | Probes `/api/clusters`; a 404 means single-cluster mode                                |
| Light / dark theme      |  ✅   | Follows the OS, overridable, persisted                                                 |
| JSON / Markdown export  |  ✅   | Links straight at the API's own export routes                                          |
| Design system           |  ✅   | Ten cards published to Claude Design, generated from `src/` so it cannot drift         |
| Container image         |  ✅   | nginx, multi-arch, signed with cosign, SBOM + provenance attestations                  |
| Fleet e2e coverage      |  ⚠️   | `serve --fixture` is single-cluster only, so fleet views rest on component tests       |
| Settings write e2e      |  ⚠️   | The write API needs a cluster, so `--admin-api` is unavailable in fixture mode         |
| Rightsizing view        |  🚧   | Appears as a generic area today; the per-workload table is not built yet               |
| PDF / SARIF download    |  ❌   | Only exposed by the CLI, not by `serve` — nothing for the UI to link to                |
| Editing roles in the UI |  ❌   | Roles are server flags (`--auth-group-role`); the UI explains them, never edits them   |

Legend: ✅ done · ⚠️ partial · 🚧 in progress · ❌ not planned here

## Quick start

Needs Node 20+ and a reachable `cluster-guardian`.

```sh
npm install

# Terminal 1 — a backend with no cluster required
cluster-guardian serve --fixture e2e/fixtures/run1.json \
                       --fixture e2e/fixtures/run2.json \
                       --listen 127.0.0.1:8099

# Terminal 2
npm run dev            # http://localhost:5173
```

Point at a different backend with `CG_URL`:

```sh
CG_URL=http://127.0.0.1:8080 npm run dev
```

Against a real cluster, run the backend in one terminal and the UI in another:

```sh
cluster-guardian serve --listen 127.0.0.1:8080 --history-dir ./history
CG_URL=http://127.0.0.1:8080 npm run dev
```

## How it talks to the backend

The SPA is same-origin with the API. Vite proxies `/api`, `/healthz` and
`/metrics` in dev; the shipped nginx config does the same in production. `/` is
deliberately **not** proxied — it belongs to the app.

| Route                               | Used for                                   |
| ----------------------------------- | ------------------------------------------ |
| `GET /api/me`                       | Identity, role, and this server's features |
| `GET /api/clusters`                 | Fleet overview; a 404 means single-cluster |
| `GET /api/report`                   | The report, single-cluster mode            |
| `GET /api/clusters/{name}/report`   | The report, fleet mode                     |
| `GET /api/history`, `/history/diff` | Trend chart and run diff                   |
| `GET /api/report/markdown`          | The Markdown download button               |
| `POST/DELETE /api/clusters`         | Settings › Clusters (admin)                |
| `GET/PUT /api/teams`                | Settings › Teams (operator to write)       |

The one mode signal is that 404. `cluster-guardian` also reports its mode from
`GET /`, but that path belongs to the SPA on this origin, so the probe is the
only method that works under every hosting arrangement.

The wire types in [src/api/types.ts](src/api/types.ts) mirror the Go model
field for field. Go marshals empty slices as `null`, so every list is typed
`T[] | null` and normalized at the edge rather than guarded at each use.

## Identity and roles

The UI never decides what you may do — it renders whatever `/api/me` reports.
Identity comes from headers set by an authenticating proxy in front of
`cluster-guardian`, and groups map to roles there:

```sh
cluster-guardian serve --fleet --admin-api \
  --teams-configmap cluster-guardian-teams \
  --auth-mode=proxy --auth-trusted-proxies=10.0.0.0/8 \
  --auth-group-role=platform=admin \
  --auth-group-role=sre=operator
```

| Role       | In the UI                                              |
| ---------- | ------------------------------------------------------ |
| `viewer`   | Read everything; Settings shows Preferences and Access |
| `operator` | + edit team ownership                                  |
| `admin`    | + register and remove clusters                         |

Two things gate every write control, and the UI distinguishes them because the
fix is different:

- **Your role** — "Requires clusters:write. Your role is viewer."
- **This deployment** — "This server was started without `--admin-api`, so it
  cannot make this change." No role fixes that one.

A control the caller cannot use is replaced by a notice saying which, never a
greyed-out button. Settings sections the server cannot serve are omitted
entirely; Preferences and Access are always present, because Access is where
you find out why something else is missing.

With no `--auth-mode=proxy` every caller is an anonymous viewer — reads open,
nothing writable. That is the default and the behaviour before roles existed.

## Deploy

### Container

```sh
docker run --rm -p 8080:8080 \
  -e CG_UPSTREAM=http://cluster-guardian.cluster-guardian.svc:8080 \
  ghcr.io/cluster-guardian/cluster-guardian-ui:latest
```

`CG_UPSTREAM` is substituted into the nginx config at start, so one image works
against any backend. The container listens on 8080 and runs unprivileged.

Deploy manifests are in [deploy/](deploy/).

### Static files

Every release attaches a `_dist.tar.gz`. Serve it from any web server, with two
rules: send `index.html` for unknown paths (`/clusters/{name}` must survive a
reload), and route `/api` to the backend.

## Development

`make help` lists every target.

```sh
make backend        # build cluster-guardian from ../cluster-guardian
make serve-fixture  # run it on canned reports — no cluster needed
make dev            # dev server against CG_URL
make check          # lint + format + typecheck + unit tests
make e2e            # Playwright against a real serve --fixture
make build          # production bundle
make design         # regenerate the Claude Design bundle from src/
make image          # container image
```

The e2e suite boots a real `cluster-guardian` and drives the **production**
bundle through `vite preview`, so what CI exercises is what ships. Point it at a
binary with `CG_BIN`:

```sh
CG_BIN=../cluster-guardian/cluster-guardian npm run e2e
```

The suite runs the backend with `--auth-mode=proxy --auth-trusted-proxies=any`,
so it becomes any role just by setting request headers — no identity provider,
no cluster. Trusting any peer is correct _there_ and nowhere else; it is what
makes the RBAC rendering testable at all.

Two gaps, both from the same cause — fixture mode has no cluster:

- `--fixture` is single-cluster only, so the fleet views rest on component tests.
- The write API needs a cluster to write to, so `--admin-api` is unavailable and
  the Settings save paths are covered by the backend's own Go tests instead.

Backing fixture mode with a fake clientset was tried and reverted: it grew the
backend binary from 66 MB to 88 MB, which is not a reasonable price for a test
affordance.

## Design

The visual language lives in
[src/styles/tokens.css](src/styles/tokens.css) — surfaces, ink, severity,
chart marks, grades, spacing, type. Components reference roles, never hex.

`npm run design:build` wraps each preview in
[design/previews/](design/previews/) with the app's real stylesheets and emits
`design/dist/`, which is published to Claude Design. The design system is
generated from the product, so it cannot drift; CI builds it on every PR, which
fails if a preview references a token that no longer exists.

Two rules worth knowing before changing colors:

- **Severity is never color alone.** Every badge pairs a glyph with the word.
  Two severity colors sit below 3:1 on the light surface, and the pairing is
  what makes them legible there and under color-vision deficiency.
- **The chart marks are validated, not chosen.** Light passes every check
  clean. Dark passes with critical↔warning at deutan ΔE 6.2 — inside the 6–8
  band, legal only with secondary encoding. The trend chart supplies it with 2px
  surface gaps between stacked fills, a legend, labelled tooltips and a table
  view. Removing any of those means re-validating the palette.

## Security

The UI ships no credentials and stores nothing but a theme preference. It is
also unauthenticated, as is the API it reads — a fleet instance holds read-only
credentials for every registered cluster, so put both behind your ingress's
auth and restrict the namespace with RBAC and NetworkPolicies.

Report vulnerabilities via [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
