import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { onPwaNeedRefresh, applyPwaUpdate } from '../pwaUpdate';

export default function UpdateBanner() {
  const { t } = useTranslation();
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => onPwaNeedRefresh(() => setNeedsRefresh(true)), []);

  if (!needsRefresh) return null;

  return (
    <div className="w-full flex-shrink-0 bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm shadow-md">
      <span className="font-medium">{t('update.available', 'A new version is available')}</span>
      <button
        onClick={applyPwaUpdate}
        className="flex items-center gap-1.5 bg-white text-indigo-700 px-3 py-1 rounded-lg font-bold text-sm shrink-0 hover:bg-indigo-50 transition-colors"
      >
        <RefreshCw size={14} /> {t('update.refresh', 'Refresh')}
      </button>
    </div>
  );
}
