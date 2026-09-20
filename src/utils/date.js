import { safeStr } from '../sanitize';
import { parseDateOnly } from './recurrence';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a date string as DD/MM/YYYY using the locale for `lang` (he/fr/default en). */
export function formatDate(dateString, lang) {
  const strDate = safeStr(dateString);
  if (!strDate) return '';
  try {
    // Date-only strings must parse as local time, not UTC — new Date('2026-07-16')
    // parses as UTC midnight, which renders as the previous day west of UTC.
    const date = DATE_ONLY_RE.test(strDate) ? parseDateOnly(strDate) : new Date(strDate);
    if (isNaN(date.getTime())) return strDate;
    const locale = lang === 'he' ? 'he-IL' : lang === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch {
    return strDate;
  }
}
