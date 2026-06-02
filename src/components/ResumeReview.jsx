import React, { useState } from 'react';
import { X, FileText, Loader2, Save } from 'lucide-react';
import { getResumeAdvice, isAIReady } from '../services/aiAssistant';

function MarkdownText({ text }) {
  if (!text) return null;
  return (
    <span>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export default function ResumeReview({ company, language, t, onClose, onOpenSettings, onSave }) {
  const [resumeText, setResumeText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const aiReady = isAIReady();

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      await getResumeAdvice(company, resumeText, language, (partial) => setResult(partial));
    } catch (e) {
      setError(e.message || 'Error');
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (onSave && result) {
      onSave(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <div>
              <p className="font-bold">{t('resume.title', 'Resume Tailoring')}</p>
              {company && (
                <p className="text-blue-200 text-xs">{company.name}{company.role ? ` — ${company.role}` : ''}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {t('resume.privacy', 'Do not include your name, email, or phone number — this text is sent to the AI.')}
          </p>

          {!aiReady ? (
            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              ⚙️ {t('ai.noKey', 'Set API key to enable AI →')}
            </button>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  {t('resume.pasteLabel', 'Paste your work experience / resume content')}
                </label>
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder={t('resume.placeholder', 'Paste your work experience, skills, and achievements here...')}
                  rows={8}
                  className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{resumeText.length}/3000 {t('resume.chars', 'characters used')}</p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!resumeText.trim() || loading}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  !resumeText.trim() || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {t('resume.analyzing', 'Analyzing...')}
                  </span>
                ) : t('resume.analyzeButton', 'Get tailoring suggestions')}
              </button>

              {error && (
                <div className="text-center space-y-1">
                  <p className="text-red-500 text-sm">{error}</p>
                  <button onClick={onOpenSettings} className="text-xs text-purple-600 underline">
                    ⚙️ {t('ai.changeSettings', 'Change AI settings')}
                  </button>
                </div>
              )}

              {result && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-800 leading-relaxed">
                  {result.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1' : ''}><MarkdownText text={line} /></p>
                  ))}
                  {loading && (
                    <span className="inline-block w-1.5 h-3.5 bg-blue-400 animate-pulse rounded ml-0.5 align-middle" />
                  )}
                  {!loading && onSave && (
                    <button
                      onClick={handleSave}
                      className={`mt-3 text-xs flex items-center gap-1 transition-colors ${
                        saved ? 'text-green-600 font-medium' : 'text-gray-400 hover:text-blue-600'
                      }`}
                    >
                      <Save size={12} />
                      {saved ? t('chat.saved', 'Saved ✓') : t('chat.saveToNotes', 'Save to notes')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
