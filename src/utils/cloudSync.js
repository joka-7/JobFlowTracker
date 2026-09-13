/**
 * Reconcile a cloud pull against local state.
 *
 * Cloud is authoritative by default, with two exceptions the local side owns,
 * both drawn from `pending` (see ./pendingSync) — the set of records whose
 * local change has not been confirmed written to the cloud:
 *
 * - a record with a pending local edit keeps the local copy and is pushed up,
 *   because the pull's copy predates work the user can see on screen;
 * - a record with a pending local delete is dropped from the pull rather than
 *   resurrected, and the delete is reported so it can be replayed upstream.
 *
 * A record the cloud has never seen at all is kept regardless — it was created
 * while offline, or during the window before a returning session resolves (see
 * useCloudSync's `authResolved`).
 *
 * Before this, any non-empty cloud collection replaced local state outright for
 * every shared id: a user who kept working during that window had that work
 * overwritten the moment the real cloud pull landed. With `pending` empty the
 * result is identical to that old cloud-wins rule, so an unconfigured or
 * storage-blocked browser degrades to the previous behaviour rather than
 * misbehaving.
 */
export function unionOnSignIn(localItems, cloudItems, { pending, idOf = (item) => item.id } = {}) {
  const local = Array.isArray(localItems) ? localItems : [];
  const cloud = Array.isArray(cloudItems) ? cloudItems : [];
  const editedLocally = pending?.edited ?? new Set();
  const deletedLocally = pending?.deleted ?? new Set();

  const deleteFromCloud = [];
  const survivingCloud = [];
  for (const item of cloud) {
    const id = String(idOf(item));
    if (deletedLocally.has(id)) deleteFromCloud.push(id);
    else survivingCloud.push(item);
  }

  const unmatchedLocal = new Map(local.map((item) => [String(idOf(item)), item]));
  let keptLocalEdit = false;
  const merged = survivingCloud.map((cloudItem) => {
    const id = String(idOf(cloudItem));
    const localItem = unmatchedLocal.get(id);
    unmatchedLocal.delete(id);
    if (localItem && editedLocally.has(id)) {
      keptLocalEdit = true;
      return localItem;
    }
    return cloudItem;
  });

  const localOnly = [...unmatchedLocal.values()];
  return {
    merged: [...merged, ...localOnly],
    pushToCloud: keptLocalEdit || localOnly.length > 0,
    deleteFromCloud,
  };
}
