import React from 'react';

/**
 * MovableItem - wraps a content block to make it individually positionable.
 * 
 * Props:
 *   itemId    - unique identifier for this item within the document
 *   offsets   - object like { [itemId]: { x, y } } from pick.itemOffsets
 *   selected  - Set of currently selected item IDs
 *   onSelect  - (itemId, addToSelection) => void
 *   isPrint   - hide selection UI in print mode
 *   children  - the content to render
 *   style     - additional style to merge
 */
export const MovableItem = ({
  itemId,
  offsets,
  selected,
  onSelect,
  isPrint,
  selectable = true,
  children,
  style,
}) => {
  const offset = offsets?.[itemId] || { x: 0, y: 0 };
  const isSelected = selected?.has(itemId) || false;

  const handleClick = (e) => {
    if (isPrint || !selectable) return;
    e.stopPropagation();
    const addToSelection = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelect?.(itemId, addToSelection);
  };

  const transformStyle = (offset.x || offset.y)
    ? { transform: `translate(${offset.x}px, ${offset.y}px)` }
    : {};

  // Selection styling is done via CSS attribute selector [data-movable-selected]
  // so it survives innerHTML copies in EditableDocBody.

  const hoverStyle = isPrint
    ? {}
    : (selectable ? { cursor: 'pointer' } : { cursor: 'text' });

  return (
    <div
      data-movable-item={itemId}
      {...(!isPrint && selectable && isSelected ? { 'data-movable-selected': '' } : {})}
      onClick={handleClick}
      style={{
        position: 'relative',
        pointerEvents: 'auto',
        ...transformStyle,
        ...hoverStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
