import React, { useState } from 'react';
import { Trash2, Download, X } from 'lucide-react';

/**
 * Bulk Actions Bar
 * Appears when items are selected, shows bulk operations
 */
export default function BulkActionsBar({
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate,
  onBulkExport,
  onClearSelection,
  statusOptions = [],
  loading = false,
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 left-4 right-4 bg-white border-2 border-purple-500 rounded-lg shadow-lg p-4 z-40">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Selection count */}
        <div className="text-sm font-semibold text-gray-700">
          {selectedCount} selected
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status update */}
          {statusOptions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-3 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                disabled={loading}
              >
                📊 Change Status
              </button>

              {showStatusMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[150px] z-50">
                  {statusOptions.map(status => (
                    <button
                      key={status.id}
                      onClick={() => {
                        onBulkStatusUpdate(status.id);
                        setShowStatusMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                      disabled={loading}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export */}
          <button
            onClick={() => onBulkExport?.()}
            className="px-3 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1"
            disabled={loading}
          >
            <Download size={16} /> Export
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="px-3 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1"
            disabled={loading}
          >
            <Trash2 size={16} /> Delete
          </button>

          {/* Clear selection */}
          <button
            onClick={onClearSelection}
            className="px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
            disabled={loading}
          >
            <X size={16} /> Clear
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <h3 className="font-bold text-lg text-red-600 mb-2">Delete {selectedCount} items?</h3>
            <p className="text-gray-700 mb-4">This action cannot be undone.</p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onBulkDelete();
                  setShowConfirmDelete(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
