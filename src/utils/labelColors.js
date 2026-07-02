export const LABEL_COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

/**
 * Soft background tints for board cards. The empty string means "none"
 * (the default white card). All tints are light enough for dark text.
 */
export const CARD_COLOR_PALETTE = [
  '', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#d1fae5',
  '#cffafe', '#dbeafe', '#e0e7ff', '#ede9fe', '#fce7f3', '#f1f5f9',
];

export function readableTextColor(hex) {
  const c = String(hex || '').replace('#', '');
  if (c.length !== 6) return '#1f2937';
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
}
