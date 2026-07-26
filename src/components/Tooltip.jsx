// Simple tooltip wrapper: hover shows floating label
// Props: children, text (string), position ('top'|'bottom'|'left'|'right')
// Uses Tailwind group/group-hover pattern with absolute positioning

const positionClasses = {
  // top/bottom center via left-1/2 + -translate-x-1/2 — a symmetric
  // centering trick, not a left/right RTL concern (the transform itself
  // isn't direction-aware, so pairing it with a logical `start-1/2` would
  // actually break centering in RTL).
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'end-full top-1/2 -translate-y-1/2 me-2',
  right: 'start-full top-1/2 -translate-y-1/2 ms-2',
};

export default function Tooltip({ children, text, position = 'top' }) {
  if (!text) return children;

  return (
    <span className="relative group inline-flex">
      {children}
      <span
        className={`
          pointer-events-none absolute z-50 whitespace-normal max-w-xs
          rounded-full bg-gray-900 text-white text-xs font-medium
          px-3 py-1.5 shadow-lg
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          ${positionClasses[position] || positionClasses.top}
        `}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}
