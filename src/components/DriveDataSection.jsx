import { Trash2 } from 'lucide-react';

/**
 * "Your data" block in Settings, shown only while Google Drive is connected:
 * permanently deletes every synced file from the user's Drive, revokes the
 * app's access and clears this device (see useCloudSync).
 */
export default function DriveDataSection({ t, onDeleteSyncedData }) {
  if (!onDeleteSyncedData) return null;
  return (
    <div className="pt-2 border-t border-gray-100">
      <h3 className="text-xs font-bold text-gray-700 text-center mb-1.5">
        {t('settings.yourDataHeading', 'Your data')}
      </h3>
      <p className="text-xs text-gray-500 text-center mb-2">
        {t('settings.yourDataHint', 'Synced only to a private folder in your own Google Drive. Nobody else, including the app\'s developer, can read it.')}
      </p>
      <button
        type="button"
        onClick={onDeleteSyncedData}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={16} aria-hidden="true" /> {t('settings.deleteSyncedData', 'Delete synced data & disconnect')}
      </button>
    </div>
  );
}
