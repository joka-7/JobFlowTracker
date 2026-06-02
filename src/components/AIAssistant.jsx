import React, { useState } from 'react';
import { Sparkles, X, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import { getInterviewPrep, analyzePatterns, isAIReady } from '../services/aiAssistant';

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

function StreamingText({ text, loading }) {
  if (!text && !loading) return null;
  return (
    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
      {text.split('\n').map((line, i) => (
        <p key={i} className="mb-1"><MarkdownText text={line} /></p>
      ))}
      {loading && <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded ml-0.5" />}
    </div>
  );
}

export default function AIAssistant({ company, companies, language, t, onOpenSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const aiReady = isAIReady();

  const run = async (mode) => {
    if (!aiReady) { onOpenSettings(); return; }
    setActiveMode(mode);
    setStreamText('');
    setError('');
    setLoading(true);
    try {
      if (mode === 'prep' && company) {
        const interviewType = company.interviews?.length
          ? company.interviews[company.interviews.length - 1].type || 'General'
          : 'General';
        await getInterviewPrep(company, interviewType, language, setStreamText);
      } else if (mode === 'patterns') {
        await analyzePatterns(companies, setStreamText);
      }
    } catch (e) {
      setError(e.message || 'Error');
    }
    setLoading(false);
  };

  const noCompany = !company;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-2">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold">
              <Sparkles size={16} /> {t('ai.title', 'AI Assistant')}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {!aiReady && (
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                {t('ai.noKey', 'Set API key to enable AI →')}
              </button>
            )}

            <button
              onClick={() => run('prep')}
              disabled={noCompany || loading}
              className={`w-full flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors text-left ${
                noCompany ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100' :
                activeMode === 'prep' && loading ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' :
                'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700'
              }`}
            >
              {loading && activeMode === 'prep' ? <Loader2 size={16} className="animate-spin flex-shrink-0" /> : <span>🎯</span>}
              <span>
                {noCompany
                  ? t('ai.prepNoCompany', 'Select a company first')
                  : t('ai.prepButton', `Prep for interview at ${company.name}`)
                }
              </span>
            </button>

            <button
              onClick={() => run('patterns')}
              disabled={loading || !companies?.length}
              className={`w-full flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors text-left ${
                !companies?.length ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100' :
                activeMode === 'patterns' && loading ? 'bg-purple-50 border border-purple-200 text-purple-700' :
                'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700'
              }`}
            >
              {loading && activeMode === 'patterns' ? <Loader2 size={16} className="animate-spin flex-shrink-0" /> : <span>🔍</span>}
              {t('ai.patternsButton', 'Analyze my job hunt patterns')}
            </button>

            {(streamText || (loading && activeMode)) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 max-h-56 overflow-y-auto">
                {error ? (
                  <p className="text-red-600 text-sm">{error}</p>
                ) : (
                  <StreamingText text={streamText} loading={loading} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(o => !o)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:scale-110'
        } text-white`}
        title={t('ai.title', 'AI Assistant')}
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </div>
  );
}
