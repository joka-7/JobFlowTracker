import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { applyBoardDrag, itemsInColumn } from '../utils/boardOrder';

/** Mouse + touch sensors: delay on touch so column scroll still works on phones. */
export function useKanbanSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );
}

export function KanbanColumn({
  id,
  items,
  className,
  header,
  listClassName,
  renderCard,
}) {
  const ids = useMemo(() => items.map((item) => String(item.id)), [items]);
  const { setNodeRef, isOver } = useDroppable({ id: String(id) });

  return (
    <div
      className={`board-column ${className || ''} ${isOver ? 'ring-2 ring-indigo-300 ring-inset' : ''}`}
      data-kanban-column={id}
    >
      {header}
      <div ref={setNodeRef} className={listClassName} data-kanban-column-list={id}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy} id={String(id)}>
          {items.map((item) => renderCard(item, { overlay: false }))}
        </SortableContext>
      </div>
    </div>
  );
}

export function SortableKanbanCard({
  id,
  disabled = false,
  className = '',
  style,
  onOpen,
  children,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(id), disabled });

  const mergedStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
    touchAction: 'manipulation',
  };

  const handleClick = (e) => {
    if (isDragging || !onOpen) return;
    onOpen(e);
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`${className} ${isDragging ? 'z-10' : ''}`}
      data-kanban-card={id}
      data-dragging={isDragging ? 'true' : undefined}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

/**
 * Multi-column kanban DnD (within-column reorder + cross-column move).
 * Touch-friendly via TouchSensor delay; works in installed PWA.
 */
export default function KanbanDndBoard({
  items,
  statuses,
  onReorder,
  className,
  renderColumnHeader,
  renderCard,
  renderOverlayCard,
  getColumnItems = itemsInColumn,
  columnClassName,
  listClassName,
  hideEmptyColumns = true,
}) {
  const sensors = useKanbanSensors();
  const [activeId, setActiveId] = useState(null);
  const columnIds = useMemo(() => statuses.map((s) => String(s.id)), [statuses]);

  const activeItem = useMemo(
    () => (activeId == null ? null : items.find((i) => String(i.id) === String(activeId)) || null),
    [activeId, items],
  );

  const handleDragStart = (event) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => setActiveId(null);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const result = applyBoardDrag(items, {
      activeId: String(active.id),
      overId: String(over.id),
      columnIds,
    });
    if (result) onReorder(result);
  };

  const visibleStatuses = hideEmptyColumns
    ? statuses.filter((s) => getColumnItems(items, s.id).length > 0)
    : statuses;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={className}>
        {visibleStatuses.map((status) => {
          const columnItems = getColumnItems(items, status.id);
          return (
            <KanbanColumn
              key={status.id}
              id={status.id}
              items={columnItems}
              className={typeof columnClassName === 'function' ? columnClassName(status) : columnClassName}
              listClassName={typeof listClassName === 'function' ? listClassName(status) : listClassName}
              header={renderColumnHeader(status, columnItems)}
              renderCard={renderCard}
            />
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem
          ? (renderOverlayCard
            ? renderOverlayCard(activeItem)
            : renderCard(activeItem, { overlay: true }))
          : null}
      </DragOverlay>
    </DndContext>
  );
}
