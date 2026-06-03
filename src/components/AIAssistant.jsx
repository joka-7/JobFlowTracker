import React, { useState } from 'react';
import { Sparkles, X, Loader2, AlertTriangle, ArrowLeft, FileText, MessageSquare, Save } from 'lucide-react';
import { getInterviewPrep, analyzePatterns, debriefInterview, getSchedulingAdvice, isAIReady } from '../services/aiAssistant';
import ChatModal from './ChatModal';
import ResumeReview from './ResumeReview';

function MarkdownText({ text }) {
  const safe = String(text ?? '');
  if (!safe) return null;
  const parts = safe.split(/(\*\*[^*]+\*\*)/g);
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
  const safe = String(text ?? '');
  if (!safe && !loading) return null;
  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      {safe.split('\n').map((line, i) => (
        <p key={i} className="mb-1"><MarkdownText text={line} /></p>
      ))}
      {loading && <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded ml-0.5" />}
    </div>
  );
}

// ---- Debrief screen ----
function DebriefScreen({ t, language, company, onBack, onOpenSettings, onSaveToCompany }) {
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState(
    company ? `${company.name}${company.role ? ` — ${company.role}` : ''}` : ''
  );
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const saveResult = () => {
    if (onSaveToCompany && streamText) {
      onSaveToCompany(company?.id, streamText);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const run = async () => {
    if (!notes.trim()) return;
    setStreamText('');
    setError('');
    setLoading(true);
    try {
      await debriefInterview(notes.trim(), context.trim(), language, setStreamText);
    } catch (e) {
      setError(e.message || 'Error');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <FileText size={14} className="text-green-600" />
          {t('ai.debriefTitle', 'Interview Debrief')}
        </span>
      </div>

      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            {t('ai.debriefContext', 'Company / Role (optional)')}
          </label>
          <input
            type="text"
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Google — Senior Engineer"
            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            {t('ai.debriefNotes', 'Paste your post-interview notes')}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('ai.debriefPlaceholder', 'Write anything — what questions were asked, how you answered, how you felt, what surprised you...')}
            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none resize-none h-28"
          />
          <p className="text-[11px] text-amber-600 mt-1">
            ⚠️ {t('ai.debriefPrivacy', 'Avoid writing personal names — this text is sent to the AI.')}
          </p>
        </div>

        <button
          onClick={run}
          disabled={!notes.trim() || loading}
          className={`w-full py-2 rounded-lg text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 ${
            !notes.trim() || loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> {t('ai.analyzing', 'Analyzing...')}</>
            : `✨ ${t('ai.debriefRun', 'Analyze my notes')}`
          }
        </button>

        {(streamText || error) && (
          <div className="space-y-1.5">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              {error ? (
                <div className="space-y-2">
                  <p className="text-red-600 text-sm">{error}</p>
                  <button onClick={() => { onBack(); onOpenSettings?.(); }} className="text-xs text-purple-600 underline hover:text-purple-800">
                    ⚙️ Change AI settings
                  </button>
                </div>
              ) : (
                <StreamingText text={streamText} loading={loading} />
              )}
            </div>
            {streamText && !loading && !error && onSaveToCompany && (
              <button
                onClick={saveResult}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-colors border ${
                  saved
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                }`}
              >
                <Save size={14} />
                {saved ? t('chat.saved', 'Saved ✓') : t('chat.saveToNotes', 'Save to notes')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main panel ----
export default function AIAssistant({ company, companies, language, t, onOpenSettings, onSaveToCompany }) {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState('menu'); // 'menu' | 'debrief'
  const [chatOpen, setChatOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultSaved, setResultSaved] = useState(false);

  const saveResult = () => {
    if (onSaveToCompany && streamText) {
      onSaveToCompany(company?.id, streamText);
      setResultSaved(true);
      setTimeout(() => setResultSaved(false), 2000);
    }
  };

  const aiReady = isAIReady();

  const openPanel = () => { setIsOpen(true); setScreen('menu'); setStreamText(''); setError(''); };

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
        await analyzePatterns(companies, language, setStreamText);
      } else if (mode === 'schedule' && company) {
        await getSchedulingAdvice(company, language, setStreamText);
      }
    } catch (e) {
      setError(e.message || 'Error');
    }
    setLoading(false);
  };

  const noCompany = !company;
  const hasUpcomingInterview = !!(company?.interviews?.some(
    i => i.date && new Date(i.date) > new Date()
  ));

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-2 flex flex-col max-h-[560px]">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles size={15} /> {t('ai.title', 'AI Assistant')}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {screen === 'debrief' ? (
            <DebriefScreen
              t={t}
              language={language}
              company={company}
              onBack={() => setScreen('menu')}
              onOpenSettings={onOpenSettings}
              onSaveToCompany={onSaveToCompany}
            />
          ) : (
            <div className="p-4 space-y-2 overflow-y-auto">
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
                onClick={() => { if (aiReady) setScreen('debrief'); else onOpenSettings(); }}
                disabled={loading}
                className="w-full flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors text-left bg-green-50 hover:bg-green-100 border border-green-200 text-green-700"
              >
                <span>📝</span>
                {t('ai.debriefButton', 'Analyze interview notes')}
              </button>

              <button
                onClick={() => { setIsOpen(false); setChatOpen(true); }}
                className="w-full flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700"
              >
                <MessageSquare size={15} />
                {t('ai.chatButton', 'Open AI chat')}
              </button>

              <button
                onClick={() => { if (aiReady) { setIsOpen(false); setResumeOpen(true); } else onOpenSettings(); }}
                disabled={noCompany || loading}
                className={`w-full flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors text-left ${
                  noCompany ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100' :
                  'bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700'
                }`}
              >
                <span>📄</span>
                <span>{noCompany ? t('ai.prepNoCompany', 'Select a company first') : t('ai.resumeButton', 'Tailor resume for this role')}</span>
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

              <button
                onClick={() => run('schedule')}
                disabled={!hasUpcomingInterview || loading}
                title={!hasUpcomingInterview ? t('ai.scheduleNoDate', 'Add an interview date first') : undefined}
                className={`w-full flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors text-left ${
                  !hasUpcomingInterview ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100' :
                  activeMode === 'schedule' && loading ? 'bg-orange-50 border border-orange-200 text-orange-700' :
                  'bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700'
                }`}
              >
                {loading && activeMode === 'schedule' ? <Loader2 size={16} className="animate-spin flex-shrink-0" /> : <span>📅</span>}
                <span>
                  {!hasUpcomingInterview
                    ? t('ai.scheduleNoDate', 'Add an interview date first')
                    : t('ai.scheduleButton', 'Interview prep schedule')
                  }
                </span>
              </button>

              {(streamText || error || (loading && activeMode && activeMode !== 'debrief')) && (
                <div className="mt-1 space-y-1.5">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 max-h-52 overflow-y-auto">
                    {error ? (
                      <div className="space-y-2">
                        <p className="text-red-600 text-sm">{error}</p>
                        <button onClick={onOpenSettings} className="text-xs text-purple-600 underline hover:text-purple-800">
                          ⚙️ {t('ai.changeSettings', 'Change AI settings')}
                        </button>
                      </div>
                    ) : (
                      <StreamingText text={streamText} loading={loading} />
                    )}
                  </div>
                  {streamText && !loading && !error && onSaveToCompany && (
                    <button
                      onClick={saveResult}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-colors border ${
                        resultSaved
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                      }`}
                    >
                      <Save size={14} />
                      {resultSaved ? t('chat.saved', 'Saved ✓') : t('chat.saveToNotes', 'Save to notes')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => isOpen ? setIsOpen(false) : openPanel()}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:scale-110'
        } text-white`}
        title={t('ai.title', 'AI Assistant')}
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {chatOpen && (
        <ChatModal
          key={`ai-chat-${company?.id || 'general'}`}
          company={company}
          language={language}
          sessionKey={`ai-chat-${company?.id || 'general'}`}
          t={t}
          onClose={() => setChatOpen(false)}
          onOpenSettings={() => { setChatOpen(false); onOpenSettings(); }}
          onSaveToCompany={onSaveToCompany}
        />
      )}

      {resumeOpen && company && (
        <ResumeReview
          company={company}
          language={language}
          t={t}
          onClose={() => setResumeOpen(false)}
          onOpenSettings={() => { setResumeOpen(false); onOpenSettings(); }}
          onSave={onSaveToCompany ? (text) => onSaveToCompany(company.id, text) : null}
        />
      )}
    </div>
  );
}
