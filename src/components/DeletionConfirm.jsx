import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal confirmation dialog for destructive actions.
 * Can be used with undo in a Toast instead for UX best practices.
 */
export default function DeletionConfirm({
  itemName,
  itemType = 'item', // 'company', 'candidate', 'task'
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 p-5 flex items-start gap-3">
          <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg text-red-900">Delete {itemType}?</h3>
            <p className="text-sm text-red-700 mt-1">This action cannot be undone.</p>
          </div>
          <button
            onClick={onCancel}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to permanently delete <strong>{itemName}</strong>?
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
