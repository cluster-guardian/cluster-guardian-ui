# Security Policy

## Supported versions

Only the latest release of cluster-guardian-ui receives security fixes.

## Release integrity

Container images are cosign-signed (keyless, GitHub OIDC) and carry SBOM and
build provenance attestations on the manifest:

```sh
cosign verify ghcr.io/cluster-guardian/cluster-guardian-ui:v0.1.0 \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp 'https://github.com/cluster-guardian/cluster-guardian-ui/\.github/workflows/release\.yml@refs/tags/v.*'

docker buildx imagetools inspect ghcr.io/cluster-guardian/cluster-guardian-ui:v0.1.0 \
  --format '{{ json .SBOM }}'
```

Static bundles attached to a release ship with `checksums.txt`.

## Threat model

This is a static single-page app. It holds no credentials, writes nothing but a
theme preference to `localStorage`, and only ever issues `GET` requests to the
cluster-guardian API.

Two things it deliberately does **not** do, so you can plan for them:

- **It does not authenticate.** Neither does the API it reads. A fleet instance
  holds read-only credentials for every registered cluster, and its API exposes
  every cluster's findings. Put both behind your ingress's authentication and
  restrict the namespace with RBAC and NetworkPolicies.
- **It trusts the API's response.** Report content is rendered as text, never as
  HTML, so a finding cannot inject markup — but the UI shows whatever the
  backend reports, and it is only as trustworthy as the backend.

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Report it privately via
[GitHub private vulnerability reporting](https://github.com/cluster-guardian/cluster-guardian-ui/security/advisories/new)
("Report a vulnerability" in the Security tab). Include what you can:

- A description of the vulnerability and its impact
- Steps to reproduce
- Affected version or commit

You can expect an acknowledgement within a few days. Once a fix is available,
the vulnerability is disclosed in the release notes.

Vulnerabilities in the analysis engine or REST API belong in
[cluster-guardian](https://github.com/cluster-guardian/cluster-guardian/security/advisories/new).
