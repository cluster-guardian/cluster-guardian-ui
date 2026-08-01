import { useSession } from '../../api/session-context';

/**
 * Who the request is authenticated as, and at what role. Anonymous is shown
 * rather than hidden: "you are not signed in" explains a missing button far
 * better than the button simply not being there.
 */
export function UserMenu() {
  const { identity } = useSession();

  const label = identity.anonymous ? 'Anonymous' : identity.user;
  const initials = identity.anonymous
    ? '?'
    : (identity.user ?? '?')
        .split(/[.\-_@\s]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');

  const title = [
    identity.anonymous ? 'Not signed in' : `Signed in as ${identity.user}`,
    `Role: ${identity.role}`,
    identity.groups?.length ? `Groups: ${identity.groups.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="usermenu" title={title}>
      <span className="usermenu__avatar" aria-hidden="true">
        {initials || '?'}
      </span>
      <span className="usermenu__text">
        <span className="usermenu__name">{label}</span>
        <span className={`usermenu__role usermenu__role--${identity.role}`}>{identity.role}</span>
      </span>
    </div>
  );
}
