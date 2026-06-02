import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, ExternalLink, CheckCircle, Trash2 } from 'lucide-react';
import { initAI, isAIReady } from '../services/aiAssistant';

export default function APIKeySettings({ t, onClose }) {
  const [key, setKey] = useState(localStorage.getItem('anthropicApiKey') || '');
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    localStorage.setItem('anthropicApiKey', trimmed);
    initAI(trimmed);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem('anthropicApiKey');
    setKey('');
    window.location.reload();
  };

  const alreadySet = isAIReady();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Key size={20} /> {t('settings.title', 'AI Settings')}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {alreadySet && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <CheckCircle size={16} className="text-green-600" />
              {t('settings.keyActive', 'API key is active — AI features are enabled')}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('settings.apiKeyLabel', 'Anthropic API Key')}
            </label>
            <div className="relative">
              <input
                type={visible ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              {t('settings.keyNote', 'Your key is stored only in this browser and never sent to our servers.')}
            </p>
          </div>

          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            <ExternalLink size={14} />
            {t('settings.getKey', 'Get a free API key from Anthropic Console →')}
          </a>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-colors ${
                saved ? 'bg-green-500' : key.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saved ? `✓ ${t('settings.saved', 'Saved!')}` : t('settings.save', 'Save & Enable AI')}
            </button>
            {alreadySet && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                title={t('settings.clearKey', 'Remove API key')}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
