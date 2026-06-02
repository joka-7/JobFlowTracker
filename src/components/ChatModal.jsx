import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Save, MessageSquare } from 'lucide-react';
import { streamChat, isAIReady } from '../services/aiAssistant';

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

function Message({ msg, onSave, t }) {
  const isUser = msg.role === 'user';
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(msg.content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative ${
        isUser
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1' : ''}><MarkdownText text={line} /></p>
        ))}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse rounded ml-0.5 align-middle" />
        )}
        {!isUser && !msg.streaming && onSave && (
          <button
            onClick={handleSave}
            className={`mt-2 text-[11px] flex items-center gap-1 transition-colors ${
              saved ? 'text-green-600 font-medium' : 'text-gray-400 hover:text-indigo-600'
            }`}
          >
            <Save size={11} />
            {saved ? t('chat.saved', 'Saved ✓') : t('chat.saveToNotes', 'Save to notes')}
          </button>
        )}
      </div>
    </div>
  );
}

// sentinel value used to trigger AI-first simulation without showing a user bubble
const SIM_TRIGGER = '__sim_start__';

export default function ChatModal({
  company, language, t, onClose, onOpenSettings, onSaveToCompany,
  systemPromptOverride, // simulation: overrides default system prompt
  simulationTitle,      // simulation: header subtitle
  autoStart,            // simulation: fires hidden trigger on mount so AI speaks first
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const autoStarted = useRef(false);

  const aiReady = isAIReady();

  const systemPrompt = systemPromptOverride || (company
    ? `You are a helpful job search assistant. The user is tracking their application to ${company.name}${company.role ? ` for the role of ${company.role}` : ''}${company.location ? ` in ${company.location}` : ''}. Current status: ${company.status}. Number of interviews: ${company.interviews?.length || 0}. Be concise and practical.`
    : 'You are a helpful job search assistant. Be concise and practical.');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (textOverride) => {
    const isTrigger = textOverride === SIM_TRIGGER;
    const text = isTrigger ? SIM_TRIGGER : (textOverride || input).trim();
    if ((!isTrigger && !text) || loading) return;
    if (!aiReady) { onOpenSettings(); return; }

    // For the hidden sim trigger, don't add a user bubble to UI
    const visibleUserMsg = isTrigger ? null : { role: 'user', content: text };
    const newMessages = visibleUserMsg ? [...messages, visibleUserMsg] : [...messages];
    if (visibleUserMsg) setMessages(newMessages);
    if (!textOverride) setInput('');
    setError('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    // strip UI-only fields; replace trigger with a neutral user turn for the API
    const apiMessages = [
      ...newMessages.map(({ role, content }) => ({ role, content })),
      ...(isTrigger ? [{ role: 'user', content: 'begin' }] : []),
    ];

    try {
      await streamChat(
        apiMessages,
        systemPrompt,
        (partial) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: partial, streaming: true };
            return updated;
          });
        },
      );
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
        return updated;
      });
    } catch (e) {
      setMessages(prev => prev.filter(m => !m.streaming));
      setError(e.message || 'Error');
    }
    setLoading(false);
  };

  // Auto-start: fire hidden trigger so AI opens the simulation
  useEffect(() => {
    if (autoStart && aiReady && !autoStarted.current) {
      autoStarted.current = true;
      const timer = setTimeout(() => send(SIM_TRIGGER), 150);
      return () => clearTimeout(timer);
    }
  }, [aiReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = (content) => {
    if (onSaveToCompany && company) {
      onSaveToCompany(company.id, content);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-[600px] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <span className="text-base">{simulationTitle ? '🎭' : <MessageSquare size={16} />}</span>
            <div>
              <p className="font-bold text-sm">{simulationTitle ? t('chat.simulationTitle', 'Mock Interview') : t('chat.title', 'AI Chat')}</p>
              <p className="text-indigo-200 text-xs">
                {simulationTitle || (company && `${company.name}${company.role ? ` — ${company.role}` : ''}`)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-400 mt-8">
              {simulationTitle
                ? <p className="text-3xl mb-3">🎭</p>
                : <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              }
              <p className="text-sm">
                {simulationTitle
                  ? t('chat.simulationEmpty', 'Starting your mock interview...')
                  : t('chat.empty', 'Start the conversation...')}
              </p>
              {!simulationTitle && company && (
                <p className="text-xs mt-1 text-gray-300">
                  {t('chat.context', 'Context')}: {company.name}
                </p>
              )}
              {!simulationTitle && (
                <p className="text-[11px] text-amber-500 mt-3">
                  ⚠️ {t('chat.privacy', 'Avoid writing personal names')}
                </p>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={msg}
              t={t}
              onSave={onSaveToCompany && company && !msg.streaming ? handleSave : null}
            />
          ))}
          {error && (
            <div className="text-center mt-2 space-y-1">
              <p className="text-red-500 text-xs">{error}</p>
              <button onClick={onOpenSettings} className="text-xs text-purple-600 underline">
                ⚙️ {t('ai.changeSettings', 'Change AI settings')}
              </button>
            </div>
          )}
          <div ref={bottomRef} className="h-8" />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-3 py-3 flex-shrink-0">
          {!aiReady ? (
            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              ⚙️ {t('ai.noKey', 'Set API key to enable AI →')}
            </button>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t('chat.placeholder', 'Type a message... (Enter to send)')}
                rows={1}
                className="flex-1 resize-none p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none max-h-28 overflow-y-auto"
                style={{ height: 'auto' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                  !input.trim() || loading
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
