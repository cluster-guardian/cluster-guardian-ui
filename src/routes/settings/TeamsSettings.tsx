import { useEffect, useState } from 'react';
import { useSaveTeams, useTeams } from '../../api/queries';
import { useCan, useDenialReason, useSession } from '../../api/session-context';
import { REDACTED_URL, type Team } from '../../api/types';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, SkeletonCard } from '../../components/ui/States';
import { PermissionNotice, SettingsHeader } from './SettingsLayout';

/**
 * Namespace-to-team ownership. Saving rewrites the whole mapping, matching the
 * server's PUT semantics — so the editor works on a local copy and commits it
 * in one go rather than pretending each row saves independently.
 */
export function TeamsSettings() {
  const can = useCan();
  const why = useDenialReason();
  const { features } = useSession();
  const teams = useTeams(features.teams);
  const save = useSaveTeams();

  const [draft, setDraft] = useState<Team[] | null>(null);
  // Adopt the server's copy whenever it changes and there is no edit in
  // flight; an in-progress edit must not be clobbered by a refetch.
  useEffect(() => {
    if (teams.data && draft === null) setDraft(teams.data);
  }, [teams.data, draft]);

  const mayWrite = can('teams:write');
  const dirty = draft !== null && teams.data !== undefined && !sameTeams(draft, teams.data);

  if (!features.teams) {
    return (
      <>
        <SettingsHeader title="Teams" />
        <PermissionNotice reason="This server was started without --teams-configmap, so team ownership is not editable here. It can still be set from a teams file or namespace labels." />
      </>
    );
  }

  return (
    <>
      <SettingsHeader
        title="Teams"
        description="Map namespaces to the teams that own them. Ownership is stamped onto reports during analysis, so a change shows up in findings after the next scan."
        actions={
          mayWrite && draft ? (
            <>
              <button
                type="button"
                className="button"
                disabled={!dirty || save.isPending}
                onClick={() => setDraft(teams.data ?? [])}
              >
                Discard
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate(draft, { onSuccess: (saved) => setDraft(saved) })}
              >
                {save.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : undefined
        }
      />

      {!mayWrite && <PermissionNotice reason={why('teams:write') ?? ''} />}

      {save.isError && <p className="form__error">{(save.error as Error)?.message}</p>}
      {save.isSuccess && !dirty && <p className="form__ok">Saved.</p>}

      {teams.isPending && <SkeletonCard height={200} />}
      {teams.isError && (
        <Card>
          <ErrorState error={teams.error} context="Could not load team ownership" />
        </Card>
      )}

      {draft && (
        <Card>
          {draft.length === 0 ? (
            <EmptyState
              title="No teams defined"
              detail="Add one to route findings and notifications by owner."
            />
          ) : (
            <div className="stack">
              {draft.map((team, i) => (
                <TeamEditor
                  key={i}
                  team={team}
                  readOnly={!mayWrite}
                  onChange={(next) => setDraft(draft.map((t, j) => (i === j ? next : t)))}
                  onRemove={() => setDraft(draft.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {mayWrite && (
            <div className="form__buttons" style={{ marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className="button"
                onClick={() => setDraft([...draft, { name: '', namespaces: [] }])}
              >
                Add team
              </button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function TeamEditor({
  team,
  readOnly,
  onChange,
  onRemove,
}: {
  team: Team;
  readOnly: boolean;
  onChange: (t: Team) => void;
  onRemove: () => void;
}) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <label className="field">
        <span className="field__label">Team name</span>
        <input
          type="text"
          value={team.name}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...team, name: e.target.value })}
          placeholder="payments-team"
        />
      </label>

      <label className="field">
        <span className="field__label">Namespaces</span>
        <input
          type="text"
          value={team.namespaces.join(', ')}
          readOnly={readOnly}
          onChange={(e) =>
            onChange({
              ...team,
              namespaces: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="payments, checkout"
        />
        <span className="field__hint">
          Comma-separated. A namespace can belong to only one team; the server rejects an overlap.
        </span>
      </label>

      <label className="field">
        <span className="field__label">Notification webhook</span>
        <input
          type="text"
          value={team.notifyUrl ?? ''}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...team, notifyUrl: e.target.value || undefined })}
          placeholder="https://hooks.slack.com/services/…"
        />
        <span className="field__hint">
          {team.notifyUrl === REDACTED_URL
            ? 'A webhook is configured. The URL is a credential and is not sent to the browser — leave this as ••• to keep it, or type a new one to replace it.'
            : 'This team hears about new findings in its own namespaces.'}
        </span>
      </label>

      {!readOnly && (
        <button type="button" className="button" onClick={onRemove}>
          Remove team
        </button>
      )}
    </div>
  );
}

function sameTeams(a: Team[], b: Team[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
