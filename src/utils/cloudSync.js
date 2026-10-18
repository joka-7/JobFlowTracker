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
 * A record the cloud has never seen at all is kept — it was created while
 * offline, or during the window before a returning session resolves (see
 * useCloudSync's `authResolved`) — unless `cloudDeletedIds` says another device
 * deleted it and this device has no unsynced edit to it: re-uploading that
 * stale copy would undo the delete.
 *
 * `pushIds` lists only the records the cloud lacks or holds stale. Every Drive
 * write is stamped newest, so re-sending an unchanged shared record would let
 * this device's copy beat an edit another device made in the meantime.
 *
 * Before this, any non-empty cloud collection replaced local state outright for
 * every shared id: a user who kept working during that window had that work
 * overwritten the moment the real cloud pull landed. With `pending` empty the
 * result is identical to that old cloud-wins rule, so an unconfigured or
 * storage-blocked browser degrades to the previous behaviour rather than
 * misbehaving.
 */
export function unionOnSignIn(localItems, cloudItems, { pending, cloudDeletedIds = [], idOf = (item) => item.id } = {}) {
  const local = Array.isArray(localItems) ? localItems : [];
  const cloud = Array.isArray(cloudItems) ? cloudItems : [];
  const editedLocally = pending?.edited ?? new Set();
  const deletedLocally = pending?.deleted ?? new Set();
  const deletedInCloud = new Set(cloudDeletedIds.map(String));

  const deleteFromCloud = [];
  const survivingCloud = [];
  for (const item of cloud) {
    const id = String(idOf(item));
    if (deletedLocally.has(id)) deleteFromCloud.push(id);
    else survivingCloud.push(item);
  }

  const unmatchedLocal = new Map(local.map((item) => [String(idOf(item)), item]));
  const pushIds = [];
  const merged = survivingCloud.map((cloudItem) => {
    const id = String(idOf(cloudItem));
    const localItem = unmatchedLocal.get(id);
    unmatchedLocal.delete(id);
    if (localItem && editedLocally.has(id)) {
      pushIds.push(id);
      return localItem;
    }
    return cloudItem;
  });

  const localOnly = [...unmatchedLocal.entries()]
    .filter(([id]) => !deletedInCloud.has(id) || editedLocally.has(id))
    .map(([id, item]) => {
      pushIds.push(id);
      return item;
    });
  return {
    merged: [...merged, ...localOnly],
    pushToCloud: pushIds.length > 0,
    pushIds,
    deleteFromCloud,
  };
}
