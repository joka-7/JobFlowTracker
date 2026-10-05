import { Globe } from 'lucide-react';

/** Credit line for views with one genuine scrollable bottom (stats, timeline,
 * calendar, priority, type) — board/list are split-pane with independent
 * scroll regions and have no single bottom, so they don't render this. */
export default function AppFooter({ t }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      <span className="text-[11px] text-gray-600">{t('settings.credit', 'Built by joka-7')}</span>
      <a
        href="https://jk-dev-7.vercel.app"
        target="_blank"
        rel="noreferrer"
        aria-label="jk.dev portfolio"
        title="jk.dev portfolio"
        className="tap-fx text-gray-400 hover:text-gray-600"
      >
        <Globe size={14} aria-hidden />
      </a>
    </div>
  );
}
