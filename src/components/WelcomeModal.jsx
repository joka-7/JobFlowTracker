import React from 'react';
import { X } from 'lucide-react';
import AppBrandMark from './AppBrandMark';

/** Single-step welcome dialog (e.g. Task Manager first visit). */
export default function WelcomeModal({
  title, subtitle, description, skipLabel, startLabel, onClose, onComplete,
}) {
  const finish = (markComplete) => {
    if (markComplete) onComplete?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white relative">
          <button
            type="button"
            onClick={() => finish(true)}
            className="absolute top-4 end-4 text-white/70 hover:text-white transition-colors"
            aria-label={skipLabel}
          >
            <X size={20} />
          </button>
          <div className="mb-3"><AppBrandMark size={48} /></div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-green-100 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="p-6">
          <p className="text-gray-600 text-center leading-relaxed">{description}</p>
        </div>
        <div className="px-6 pb-6 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            {skipLabel}
          </button>
          <button
            type="button"
            onClick={() => finish(true)}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
          >
            {startLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
