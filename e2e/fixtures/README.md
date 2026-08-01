# Fixtures

Canned `cluster-guardian` reports, replayed by `serve --fixture` so the UI can
be developed and tested with no Kubernetes cluster anywhere in the loop.

`run1.json` then `run2.json` are appended to history in that order, and the last
one becomes the current report — two files is what lights up the trend chart and
the run-over-run diff.

```sh
cluster-guardian serve --fixture e2e/fixtures/run1.json \
                       --fixture e2e/fixtures/run2.json \
                       --listen 127.0.0.1:8099
```

They are copies of the backend's own fixtures (`testdata/fixtures/` there),
kept here so this repository's e2e suite does not need a checkout of the other
one. Refresh them from upstream when the report schema changes — the e2e
assertions hardcode counts from these files (22 findings, score 34, 19 new /
12 resolved), so a refresh means updating those too.

Fixture mode is single-cluster only, so the fleet views have no e2e coverage;
they are tested at the component level instead.
