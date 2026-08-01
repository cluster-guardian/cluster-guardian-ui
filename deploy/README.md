# Deploy

Plain manifests for running the UI next to an existing `cluster-guardian`
in the same namespace.

```sh
kubectl apply -n cluster-guardian -f deploy/deployment.yaml
kubectl port-forward -n cluster-guardian svc/cluster-guardian-ui 8080:80
```

Then open http://127.0.0.1:8080.

## Adjusting

- **Backend address** — `CG_UPSTREAM` on the container. It defaults to
  `http://cluster-guardian:8080`, which is right when both live in the same
  namespace and the backend Service keeps its chart's default name.
- **Exposure** — no Ingress is included on purpose. Neither the UI nor the API
  authenticates, so exposing it is a decision that belongs with whatever handles
  auth in your cluster. Add an Ingress or HTTPRoute in front, with
  authentication, and keep the NetworkPolicy.
- **Serving the API on the same host** — the image proxies `/api`, `/healthz`
  and `/metrics` itself, so a single Ingress rule pointing at
  `cluster-guardian-ui` is enough. Do not route `/` to the backend; that path
  belongs to the app.

## Read-only root filesystem

The pod runs as uid 101 with `readOnlyRootFilesystem: true`. That needs three
things together, and dropping any one of them stops the container from booting:

- an `emptyDir` at `/tmp` — nginx's pid file and proxy temp files;
- an `emptyDir` at `/etc/nginx/conf.d` — where the entrypoint renders
  `default.conf` from the template at start, substituting `CG_UPSTREAM`;
- `fsGroup: 101` — an `emptyDir` is root-owned by default, so without it the
  render fails and nginx starts with no server block.

The image is built on `nginx-unprivileged` for this reason. Stock `nginx` cannot
run as non-root with a read-only root: it fails opening `/run/nginx.pid`, and
its `/etc/nginx/conf.d` is root-owned, so the template silently never renders.
