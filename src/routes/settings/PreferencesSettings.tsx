import { useId, type ReactNode } from 'react';
import type { Severity } from '../../api/types';
import { SEVERITY_LABEL, SEVERITY_ORDER } from '../../lib/severity';
import { clearPreferences, DEFAULT_PREFERENCES, type Preferences } from '../../lib/preferences';
import { Card } from '../../components/ui/Card';
import { SettingsHeader } from './SettingsLayout';

interface Props {
  prefs: Preferences;
  onChange: (next: Preferences) => void;
}

/**
 * Display preferences. These belong to the viewer, not the deployment, so they
 * need no role and are stored in the browser — two people looking at the same
 * cluster can legitimately want different things.
 */
export function PreferencesSettings({ prefs, onChange }: Props) {
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) =>
    onChange({ ...prefs, [k]: v });

  return (
    <>
      <SettingsHeader
        title="Preferences"
        description="How this dashboard behaves for you. Stored in this browser only — no role required, and nothing here is shared with other users."
        actions={
          <button
            type="button"
            className="button"
            onClick={() => {
              clearPreferences();
              onChange(DEFAULT_PREFERENCES);
            }}
          >
            Reset to defaults
          </button>
        }
      />

      <Card>
        <Pref
          name="Default severities"
          desc="Which severities the Issues page starts with. OK findings are the report confirming something is fine, so they are off by default."
          control={(id) => (
            <div className="chips-inline" id={id} role="group" aria-label="Default severities">
              {SEVERITY_ORDER.map((s: Severity) => {
                const on = prefs.defaultSeverities.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className={`chip chip--${s}`}
                    aria-pressed={on}
                    onClick={() =>
                      set(
                        'defaultSeverities',
                        on
                          ? prefs.defaultSeverities.filter((x) => x !== s)
                          : [...prefs.defaultSeverities, s],
                      )
                    }
                  >
                    {SEVERITY_LABEL[s]}
                  </button>
                );
              })}
            </div>
          )}
        />

        <Pref
          name="Auto-refresh"
          desc="Poll the API in the background. In single-cluster mode a refresh can trigger a real analysis against the Kubernetes API server, so this is off by default."
          control={(id) => (
            <input
              id={id}
              type="checkbox"
              checked={prefs.autoRefresh}
              onChange={(e) => set('autoRefresh', e.target.checked)}
            />
          )}
        />

        <Pref
          name="Refresh interval"
          desc="How often to poll. The server caches reports for a TTL of its own, so polling faster than that buys nothing but load."
          control={(id) => (
            <select
              id={id}
              className="select"
              value={prefs.refreshSeconds}
              disabled={!prefs.autoRefresh}
              onChange={(e) => set('refreshSeconds', Number(e.target.value))}
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          )}
        />

        <Pref
          name="Landing page"
          desc="Where the root lands in fleet mode. Single-cluster mode always opens that cluster."
          control={(id) => (
            <select
              id={id}
              className="select"
              value={prefs.landing}
              onChange={(e) => set('landing', e.target.value as Preferences['landing'])}
            >
              <option value="fleet">Fleet overview</option>
              <option value="issues">Issues</option>
            </select>
          )}
        />

        <Pref
          name="Density"
          desc="Compact fits more rows on screen at the cost of scannability."
          control={(id) => (
            <select
              id={id}
              className="select"
              value={prefs.density}
              onChange={(e) => set('density', e.target.value as Preferences['density'])}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          )}
        />

        <Pref
          name="Always show remediation"
          desc="Expand each finding's hint instead of hiding it behind “Why”."
          control={(id) => (
            <input
              id={id}
              type="checkbox"
              checked={prefs.expandHints}
              onChange={(e) => set('expandHints', e.target.checked)}
            />
          )}
        />
      </Card>
    </>
  );
}

/**
 * A single preference row. The control is a render prop rather than a node so
 * the row can hand it a generated id and label it properly — a bare <select>
 * beside a <div> of text has no accessible name at all.
 */
function Pref({
  name,
  desc,
  control,
}: {
  name: string;
  desc: string;
  control: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="pref">
      <div className="pref__text">
        <label className="pref__name" htmlFor={id}>
          {name}
        </label>
        <p className="pref__desc">{desc}</p>
      </div>
      <div className="pref__control">{control(id)}</div>
    </div>
  );
}
