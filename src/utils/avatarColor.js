import { safeStr } from '../sanitize';

/**
 * Deterministically picks a color from `palette` based on `name` (same name
 * always maps to the same color). Callers supply their own palette so
 * different modes can keep their own visual identity.
 */
export function pickAvatarColor(name, palette, fallback = 'bg-gray-500') {
  const s = safeStr(name);
  if (!s) return fallback;
  const index = s.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[index % palette.length];
}

export function getInitials(name, fallback = '?') {
  const s = safeStr(name);
  if (!s) return fallback;
  return s.substring(0, 2).toUpperCase();
}
