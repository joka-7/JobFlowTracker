import React, { useState, useEffect } from 'react';
import { X, Loader2, Heart } from 'lucide-react';
import { analyzeRejection, isAIReady } from '../services/aiAssistant';

function MarkdownText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export default function RejectionAnalysis({ company, language, t, onClose, onOpenSettings }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  const aiReady = isAIReady();

  useEffect(() => {
    if (aiReady) {
      setStarted(true);
      run();
    }
  }, []);

  const run = async () => {
    setLoading(true);
    setError('');
    setText('');
    try {
      await analyzeRejection(company, language || 'en', setText);
    } catch (e) {
      setError(e.message || 'Error generating analysis');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-0.5">
              <Heart size={20} /> {t('rejection.analysisTitle', 'Rejection Analysis')}
            </div>
            <p className="text-red-100 text-sm">{company.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!aiReady && !started ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600 text-sm">{t('rejection.aiNeeded', 'Enable AI to get personalized improvement suggestions.')}</p>
              <button
                onClick={() => { onClose(); onOpenSettings(); }}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
              >
                {t('rejection.setupAI', 'Set up AI →')}
              </button>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-red-600 text-sm">{error}</p>
              <div className="flex gap-3">
                <button onClick={run} className="text-sm text-indigo-600 hover:underline">
                  {t('rejection.retry', 'Try again')}
                </button>
                <button
                  onClick={() => { onClose(); onOpenSettings(); }}
                  className="text-sm text-purple-600 hover:underline"
                >
                  ⚙️ {t('ai.changeSettings', 'Change AI settings')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {loading && !text && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  {t('rejection.analyzing', 'Analyzing your rejection...')}
                </div>
              )}
              {text && (
                <div className="text-sm text-gray-700 leading-relaxed space-y-1">
                  {text.split('\n').map((line, i) => (
                    <p key={i}><MarkdownText text={line} /></p>
                  ))}
                  {loading && <span className="inline-block w-1.5 h-4 bg-red-400 animate-pulse rounded ml-0.5" />}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
          >
            {t('rejection.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
