/** Stable compare for kanban cards within a column. */
export function compareBoardOrder(a, b, indexMap) {
  const hasA = typeof a.boardOrder === 'number' && Number.isFinite(a.boardOrder);
  const hasB = typeof b.boardOrder === 'number' && Number.isFinite(b.boardOrder);
  if (hasA && hasB && a.boardOrder !== b.boardOrder) return a.boardOrder - b.boardOrder;
  if (hasA && !hasB) return -1;
  if (!hasA && hasB) return 1;
  const ia = indexMap?.get(String(a.id)) ?? 0;
  const ib = indexMap?.get(String(b.id)) ?? 0;
  if (ia !== ib) return ia - ib;
  return String(a.id).localeCompare(String(b.id));
}

/** Items in a status column, sorted by boardOrder (legacy array order as fallback). */
export function itemsInColumn(items, statusId) {
  const indexMap = new Map(items.map((item, i) => [String(item.id), i]));
  return items
    .filter((item) => item.status === statusId)
    .sort((a, b) => compareBoardOrder(a, b, indexMap));
}

/** Sanitize persisted board order (finite number or omit). */
export function sanitizeBoardOrder(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

function arrayMove(list, fromIndex, toIndex) {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Apply a kanban drag: within-column reorder or cross-column move+insert.
 * @param {Array} items - full item list
 * @param {{ activeId: string, overId: string, columnIds: string[] }} drag
 * @returns {{ items: Array, changed: Array } | null} null if no-op
 */
export function applyBoardDrag(items, { activeId, overId, columnIds }) {
  const activeKey = String(activeId);
  const overKey = String(overId);
  if (!activeKey || activeKey === overKey) return null;

  const columnSet = new Set(columnIds.map(String));
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const active = byId.get(activeKey);
  if (!active) return null;

  const overIsColumn = columnSet.has(overKey);
  const overItem = overIsColumn ? null : byId.get(overKey);
  if (!overIsColumn && !overItem) return null;

  const fromStatus = active.status;
  const toStatus = overIsColumn ? overKey : overItem.status;

  const fromCol = itemsInColumn(items, fromStatus).map((item) => String(item.id));
  const oldIndex = fromCol.indexOf(activeKey);
  if (oldIndex < 0) return null;

  let nextFromIds;
  let nextToIds;

  if (fromStatus === toStatus) {
    const newIndex = overIsColumn ? fromCol.length - 1 : fromCol.indexOf(overKey);
    if (newIndex < 0 || newIndex === oldIndex) return null;
    nextToIds = arrayMove(fromCol, oldIndex, newIndex);
    nextFromIds = nextToIds;
  } else {
    nextFromIds = fromCol.filter((id) => id !== activeKey);
    const toCol = itemsInColumn(items, toStatus).map((item) => String(item.id));
    const insertIndex = overIsColumn ? toCol.length : Math.max(0, toCol.indexOf(overKey));
    nextToIds = [...toCol];
    if (insertIndex >= nextToIds.length) nextToIds.push(activeKey);
    else nextToIds.splice(insertIndex, 0, activeKey);
  }

  const orderById = new Map();
  nextFromIds.forEach((id, i) => orderById.set(id, i));
  if (fromStatus !== toStatus) {
    nextToIds.forEach((id, i) => orderById.set(id, i));
  }

  const changed = [];
  const nextItems = items.map((item) => {
    const id = String(item.id);
    if (!orderById.has(id)) return item;
    const boardOrder = orderById.get(id);
    const status = id === activeKey ? toStatus : item.status;
    if (item.status === status && item.boardOrder === boardOrder) return item;
    const updated = { ...item, status, boardOrder };
    changed.push(updated);
    return updated;
  });

  return changed.length ? { items: nextItems, changed } : null;
}
