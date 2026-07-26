import { safeStr } from '../sanitize';

/** Formats a date string as DD/MM/YYYY using the locale for `lang` (he/fr/default en). */
export function formatDate(dateString, lang) {
  const strDate = safeStr(dateString);
  if (!strDate) return '';
  try {
    const date = new Date(strDate);
    if (isNaN(date.getTime())) return strDate;
    const locale = lang === 'he' ? 'he-IL' : lang === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch {
    return strDate;
  }
}
