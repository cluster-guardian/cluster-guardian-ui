import { createContext, use } from 'react';
import { LEGACY_ME } from './client';
import type { Me, Permission } from './types';

/**
 * The caller's identity and this deployment's capabilities, resolved once and
 * read everywhere. Split from the provider component so this module holds no
 * components — fast refresh only works on a module that exports one or the
 * other, not both.
 */
export const SessionContext = createContext<Me>(LEGACY_ME);

export function useSession(): Me {
  return use(SessionContext);
}

/** Whether the permission is served by this deployment at all. */
function supports(me: Me, permission: Permission): boolean {
  if (permission === 'clusters:write') return me.features.clusters;
  if (permission === 'teams:write') return me.features.teams;
  return true;
}

/**
 * Whether the caller may do something *and* this deployment supports it. Both
 * halves matter: an admin on a server without --admin-api has the role but no
 * endpoint, and a viewer on a server with it has the endpoint but no role.
 * Either way the control should not be offered.
 *
 * Every write control asks this rather than comparing role names, so adding a
 * role on the server needs no change here.
 */
export function useCan(): (permission: Permission) => boolean {
  const me = useSession();
  return (permission) =>
    (me.identity.permissions?.includes(permission) ?? false) && supports(me, permission);
}

/** Why a control is unavailable, for the notice that replaces it. */
export function useDenialReason(): (permission: Permission) => string | null {
  const me = useSession();
  return (permission) => {
    if (!supports(me, permission)) {
      return 'This server was started without --admin-api, so it cannot make this change.';
    }
    if (!me.identity.permissions?.includes(permission)) {
      return me.identity.anonymous
        ? `Requires ${permission}. This request is anonymous — sign in through the proxy in front of cluster-guardian.`
        : `Requires ${permission}. Your role is ${me.identity.role}.`;
    }
    return null;
  };
}
