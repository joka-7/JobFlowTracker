/**
 * Union-merge by id: cloud is authoritative for any record it already has
 * (no per-record `updatedAt` exists yet to arbitrate a real conflict), but a
 * local record whose id isn't in the cloud at all — created while offline,
 * or while the header hadn't yet heard back from Firebase about a restorable
 * session (see useCloudSync's `authResolved`) — is kept and flagged to be
 * pushed up, rather than being silently dropped.
 *
 * Before this, any non-empty cloud collection replaced local state outright:
 * a user who kept working during that "haven't heard back yet" window would
 * have that work overwritten the moment the real cloud pull landed.
 */
export function unionOnSignIn(localItems, cloudItems, idOf = (item) => item.id) {
  const local = Array.isArray(localItems) ? localItems : [];
  const cloud = Array.isArray(cloudItems) ? cloudItems : [];
  if (cloud.length === 0) {
    return local.length > 0 ? { merged: local, pushToCloud: true } : { merged: [], pushToCloud: false };
  }
  const cloudIds = new Set(cloud.map(idOf));
  const localOnly = local.filter((item) => !cloudIds.has(idOf(item)));
  if (localOnly.length === 0) return { merged: cloud, pushToCloud: false };
  return { merged: [...cloud, ...localOnly], pushToCloud: true };
}
