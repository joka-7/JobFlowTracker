import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, MapPin, Globe, Calendar,
  User, CheckCircle, Clock, Trash2, Edit2,
  ArrowLeft, ArrowRight, Download, Upload, Filter, Layout, List, Activity, AlertTriangle,
  Cloud, CloudOff, Languages, BarChart2, Settings
} from 'lucide-react';
import { signInWithGoogle, signOut, onAuthChange, loadAllCompanies, updateCompany, deleteFirestoreCompany, batchSaveCompanies, publishShare, loadSharedData } from './firebase';
import { initAI } from './services/aiAssistant';
import Onboarding from './components/Onboarding';
import AIAssistant from './components/AIAssistant';
import APIKeySettings from './components/APIKeySettings';
import RejectionAnalysis from './components/RejectionAnalysis';
import TemplateLibrary from './components/TemplateLibrary';
import Tooltip from './components/Tooltip';
import { TEMPLATES } from './data/interviewTemplates';

const Linkedin = ({ size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return ''; }
  }
  return String(val);
};

const STATUSES = [
  { id: 'applied', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'hr_call', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'tech_interview', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'manager_interview', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'home_assignment', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'references', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'offer', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'frozen', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'rejected', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'ghosted', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'withdrawn', color: 'bg-stone-100 text-stone-700 border-stone-300' },
];

const PRIORITIES = [
  { id: 'high', color: 'bg-red-500' },
  { id: 'medium', color: 'bg-orange-500' },
  { id: 'low', color: 'bg-blue-500' },
];

const INTERVIEW_TYPE_KEYS = [
  'Intro Call / HR',
  'Technical Interview',
  'Manager Interview',
  'Home Assignment / Task',
  'VP / CEO Interview',
  'References Check',
  'Salary Offer',
  'Other',
];

const REJECTION_METHOD_KEYS = [
  'Automatic Email',
  'Personal Email',
  'Phone Call',
  'No Response',
  'During Interview',
  'Other',
];

const getAvatarColor = (name) => {
  const strName = safeStr(name);
  if (!strName) return 'bg-gray-500';
  const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];
  const index = strName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

const getInitials = (name) => {
  const strName = safeStr(name);
  if (!strName) return '?';
  return strName.substring(0, 2).toUpperCase();
};

const getJourneySteps = (company) => {
  const interviews = Array.isArray(company.interviews) ? company.interviews : [];
  if (interviews.length === 0) return [];
  return [...interviews]
    .filter(i => i && safeStr(i.type))
    .sort((a, b) => new Date(safeStr(a.date) || 0) - new Date(safeStr(b.date) || 0))
    .map(i => safeStr(i.type));
};

const STEP_SHORT = {
  'Intro Call / HR': 'HR',
  'Technical Interview': 'Tech',
  'Manager Interview': 'Mgr',
  'Home Assignment / Task': 'Task',
  'VP / CEO Interview': 'VP',
  'References Check': 'Refs',
  'Salary Offer': 'Offer',
  'Other': 'Other',
};
const shortenStep = (s) => STEP_SHORT[s] || s.substring(0, 6);

const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

const initialFormState = {
  name: '', role: '', location: '', status: 'applied', priority: 'medium',
  website: '', linkedinCompany: '', linkedinHR: '', description: '', products: '',
  interviews: [], homeworks: [], contacts: [], generalNotes: '',
  rejection: { date: '', method: '', notes: '' },
};

export default function JobTrackerApp() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const formatDate = (dateString) => {
    const strDate = safeStr(dateString);
    if (!strDate) return '';
    try {
      const date = new Date(strDate);
      if (isNaN(date.getTime())) return strDate;
      return new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    } catch { return strDate; }
  };

  const [isSaved, setIsSaved] = useState(true);

  const [companies, setCompanies] = useState(() => {
    try {
      const keysToTry = ['jobTrackerAppV2Data', 'jobTrackerV3Data', 'jobTrackerData'];
      for (const key of keysToTry) {
        const saved = window.localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      return [];
    } catch { return []; }
  });

  const [selectedId, setSelectedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(25);
  const [activeTab, setActiveTab] = useState('board');
  const [toastMessage, setToastMessage] = useState('');

  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const dragCompanyId = useRef(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [simulationData, setSimulationData] = useState(null); // { systemPrompt, title }
  const [rejectionCompany, setRejectionCompany] = useState(null);
  const [shareMode, setShareMode] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const provider = localStorage.getItem('aiProvider') || 'gemini';
    const apiKey = localStorage.getItem('aiApiKey') || localStorage.getItem('anthropicApiKey') || '';
    const model = localStorage.getItem('aiModel') || '';
    const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
    initAI(provider, apiKey, model, ollamaUrl);
    if (!localStorage.getItem('hasCompletedOnboarding')) {
      setShowOnboarding(true);
    }

    // Check for shared view URL: ?share=<uid>
    const params = new URLSearchParams(window.location.search);
    const shareUid = params.get('share');
    if (shareUid) {
      setShareMode(true);
      loadSharedData(shareUid).then(data => {
        if (data?.companies?.length) setCompanies(data.companies);
      }).catch(console.error);
    }
  }, []);

  const initialFormState = {
    name: '', role: '', location: '', status: 'applied', priority: 'medium',
    website: '', linkedinCompany: '', linkedinHR: '', description: '', products: '',
    interviews: [], homeworks: [], contacts: [], generalNotes: '',
    rejection: { date: '', method: '', notes: '' },
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    try {
      if (companies.length > 0) {
        setIsSaved(false);
        window.localStorage.setItem('jobTrackerAppV2Data', JSON.stringify(companies));
        const timer = setTimeout(() => setIsSaved(true), 800);
        return () => clearTimeout(timer);
      }
    } catch (e) { console.warn('LocalStorage error:', e); }
  }, [companies]);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setSyncing(true);
        try {
          const data = await loadAllCompanies(firebaseUser.uid);
          if (data && data.length > 0) {
            setCompanies(data);
            showToast(t('toast.driveConnectedWithData'));
          } else {
            showToast(t('toast.driveConnectedEmpty'));
          }
        } catch (e) { console.error(e); }
        setSyncing(false);
      }
    });
    return unsub;
  }, []);

  const openNewForm = useCallback(() => {
    setFormData(initialFormState);
    setSelectedId(null);
    setIsEditing(true);
    setActiveTab('list');
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') openNewForm();
      if (e.key === 'Escape') { setSelectedId(null); setIsEditing(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openNewForm]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      showToast(t('toast.driveFailed'));
    }
  };

  const handleSignOut = () => {
    signOut();
    showToast(t('toast.driveDisconnected'));
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const nameStr = safeStr(c.name || c.company).toLowerCase();
      const roleStr = safeStr(c.role || c.position).toLowerCase();
      const searchStr = safeStr(searchQuery).toLowerCase();
      const matchSearch = nameStr.includes(searchStr) || roleStr.includes(searchStr);
      const matchStatus = statusFilter === 'all' || safeStr(c.status) === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  useEffect(() => {
    setVisibleCount(25);
  }, [searchQuery, statusFilter]);

  const timelineEvents = useMemo(() => {
    let events = [];
    companies.forEach(company => {
      if (Array.isArray(company.interviews)) {
        company.interviews.forEach(interview => {
          if (interview && interview.date)
            events.push({ ...interview, companyName: safeStr(company.name || company.company || t('alert.noName')), eventType: 'interview', parentId: company.id });
        });
      }
      if (Array.isArray(company.homeworks)) {
        company.homeworks.forEach(hw => {
          if (hw && hw.deadline)
            events.push({ ...hw, date: hw.deadline, companyName: safeStr(company.name || company.company || t('alert.noName')), eventType: 'assignment', parentId: company.id });
        });
      }
    });
    return events.sort((a, b) => new Date(safeStr(b.date)) - new Date(safeStr(a.date)));
  }, [companies, i18n.language]);

  const stats = useMemo(() => {
    const total = companies.length;
    const byStatus = {};
    STATUSES.forEach(s => { byStatus[s.id] = companies.filter(c => c.status === s.id).length; });
    const active = companies.filter(c => !['rejected', 'ghosted', 'withdrawn', 'offer'].includes(c.status)).length;
    const responded = companies.filter(c => c.status !== 'applied').length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const interviewCount = companies.reduce((acc, c) => acc + (Array.isArray(c.interviews) ? c.interviews.length : 0), 0);
    return { total, byStatus, active, responseRate, interviewCount };
  }, [companies]);

  const upcomingEvents = useMemo(() => {
    return timelineEvents
      .filter(e => { const d = getDaysUntil(e.date); return d !== null && d >= 0 && d <= 14; })
      .sort((a, b) => new Date(safeStr(a.date)) - new Date(safeStr(b.date)));
  }, [timelineEvents]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSave = () => {
    if (!formData.name) { alert(t('form.requiredName')); return; }
    const dataToSave = {
      ...formData,
      rejection: ['rejected', 'ghosted'].includes(formData.status)
        ? (formData.rejection || { date: '', method: '', notes: '' })
        : { date: '', method: '', notes: '' },
    };
    if (dataToSave.id) {
      setCompanies(companies.map(c => String(c.id) === String(dataToSave.id) ? dataToSave : c));
      if (user) updateCompany(user.uid, dataToSave).catch(console.error);
    } else {
      const newCompany = { ...dataToSave, id: Date.now().toString() };
      setCompanies([newCompany, ...companies]);
      setSelectedId(newCompany.id);
      if (user) updateCompany(user.uid, newCompany).catch(console.error);
    }
    setIsEditing(false);
    showToast(t('toast.saved'));
  };

  const handleDelete = (id) => {
    if (window.confirm(t('alert.deleteConfirm'))) {
      setCompanies(prev => prev.filter(c => String(c.id) !== String(id)));
      setSelectedId(null);
      setIsEditing(false);
      showToast(t('toast.deleted'));
      if (user) deleteFirestoreCompany(user.uid, id).catch(console.error);
    }
  };

  const handleSaveToCompany = useCallback((companyId, text) => {
    const target = companies.find(c => String(c.id) === String(companyId));
    if (!target) return;
    const updated = {
      ...target,
      generalNotes: target.generalNotes ? `${target.generalNotes}\n\n---\n${text}` : text,
    };
    setCompanies(prev => prev.map(c => String(c.id) === String(companyId) ? updated : c));
    if (user) updateCompany(user.uid, updated).catch(console.error);
  }, [companies, user]);

  const handleRejectionNoteSave = useCallback((text) => {
    if (!rejectionCompany) return;
    const target = companies.find(c => c.id === rejectionCompany.id);
    if (!target) return;
    const updated = {
      ...target,
      generalNotes: target.generalNotes ? `${target.generalNotes}\n\n---\n${text}` : text,
    };
    setCompanies(prev => prev.map(c => c.id === rejectionCompany.id ? updated : c));
    if (user) updateCompany(user.uid, updated).catch(console.error);
  }, [companies, user, rejectionCompany]);

  const handleStartSimulation = useCallback((categoryKey) => {
    const cat = TEMPLATES[categoryKey];
    if (!cat) return;
    const isQuestionsToAsk = categoryKey === 'questions_to_ask';
    const questionList = cat.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    const systemPrompt = isQuestionsToAsk
      ? `You are a friendly, experienced hiring manager. The user is practicing asking insightful questions during a job interview.

They may ask you any of these questions (in any order or their own phrasing):
${questionList}

Rules:
- Answer each question as a real hiring manager would (2-3 sentences, specific and honest)
- After answering, give one brief tip on what made the question strong or how to phrase it better
- Stay in character throughout
- When the user says "begin", introduce yourself briefly and invite the first question`
      : `You are a professional interviewer running a ${cat.label} mock interview practice session.

Ask these questions one at a time:
${questionList}

Rules:
- Ask ONE question at a time
- After the user answers, give 2-3 sentences of feedback: start with what was good, then one specific improvement
- Then ask the next question
- After all questions, give a short overall assessment (3-4 sentences)
- Keep a professional but encouraging tone
- When the user says "begin", introduce the session in one sentence and ask question 1`;

    setSimulationData({
      systemPrompt,
      title: `${cat.icon} ${cat.label}`,
    });
    setShowTemplates(false);
  }, []);

  const handleExport = () => {
    const dataStr = JSON.stringify(companies, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `job-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.href = url;
    link.click();
    showToast(t('toast.exported'));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedRaw = JSON.parse(event.target.result);
          let importedArray = [];
          if (Array.isArray(importedRaw)) {
            importedArray = importedRaw;
          } else if (importedRaw && typeof importedRaw === 'object') {
            const potentialArray = Object.values(importedRaw).find(val => Array.isArray(val));
            importedArray = potentialArray ? potentialArray : [importedRaw];
          }
          if (importedArray.length > 0) {
            const sanitizedData = importedArray.map((c, idx) => ({
              ...c,
              name: safeStr(c.name || c.company || t('alert.unnamedCompany')),
              role: safeStr(c.role || c.position || ''),
              interviews: Array.isArray(c.interviews) ? c.interviews.map(inv => ({ ...inv, type: safeStr(inv.type || inv.round || '') })) : [],
              rejection: c.rejection || { date: '', method: '', notes: '' },
              id: c.id ? String(c.id) : Date.now().toString() + idx,
            }));
            setCompanies(sanitizedData);
            showToast(t('toast.imported'));
            if (user) batchSaveCompanies(user.uid, sanitizedData).catch(console.error);
          } else {
            alert(t('alert.noCompanyData'));
          }
        } catch {
          alert(t('alert.importError'));
        }
      };
      reader.readAsText(file);
    }
    e.target.value = null;
  };

  const selectCompany = (company) => {
    setSelectedId(company.id);
    setFormData({ ...initialFormState, ...company, rejection: company.rejection || { date: '', method: '', notes: '' } });
    setIsEditing(false);
  };

  const triggerFileInput = () => document.getElementById('main-file-upload').click();

  const handleDragStart = (e, companyId) => {
    dragCompanyId.current = companyId;
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; dragCompanyId.current = null; };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e, statusId) => {
    e.preventDefault();
    const id = dragCompanyId.current;
    if (!id) return;
    const company = companies.find(c => String(c.id) === String(id));
    setCompanies(prev => prev.map(c => String(c.id) === String(id) ? { ...c, status: statusId } : c));
    dragCompanyId.current = null;
    showToast(t('toast.saved'));
    if (user && company) updateCompany(user.uid, { ...company, status: statusId }).catch(console.error);
  };

  const timelineBorder = isRTL ? 'border-r-2 pr-6' : 'border-l-2 pl-6';
  const timelineDot = isRTL ? '-right-[31px]' : '-left-[31px]';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const renderBoard = () => (
    <div className="flex-1 overflow-x-auto p-6 bg-slate-50 min-h-0 flex gap-6">
      {STATUSES.map(statusObj => {
        const statusCompanies = companies.filter(c => c.status === statusObj.id);
        if (statusCompanies.length === 0) return null;
        return (
          <div
            key={statusObj.id}
            className="w-80 flex-shrink-0 flex flex-col h-full"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, statusObj.id)}
          >
            <div className={`rounded-t-xl px-4 py-3 font-bold border-b-4 shadow-sm ${statusObj.color}`}>
              {t(`status.${statusObj.id}`)} ({statusCompanies.length})
            </div>
            <div className="bg-gray-100 rounded-b-xl p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {statusCompanies.map(company => {
                const journeySteps = getJourneySteps(company);
                const isRejected = ['rejected', 'ghosted'].includes(company.status);
                return (
                  <div
                    key={company.id}
                    draggable
                    onDragStart={e => handleDragStart(e, company.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => { selectCompany(company); setActiveTab('list'); }}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="font-bold text-gray-800 mb-1">{safeStr(company.name)}</div>
                    <div className="text-sm text-gray-600">{safeStr(company.role)}</div>
                    {company.location && (
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <MapPin size={12} /> {safeStr(company.location)}
                      </div>
                    )}
                    {journeySteps.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-0.5">
                        {journeySteps.map((step, i) => (
                          <React.Fragment key={i}>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isRejected ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                              {shortenStep(step)}
                            </span>
                            {i < journeySteps.length - 1 && <span className="text-gray-300 text-[10px]">›</span>}
                          </React.Fragment>
                        ))}
                        {isRejected && (
                          <>
                            <span className="text-gray-300 text-[10px]">›</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-600">
                              {t(`status.${company.status}`)}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {companies.length === 0 && (
        <div className="w-full flex flex-col items-center justify-center p-8">
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200 text-center max-w-lg w-full">
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity size={40} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">{t('board.emptyTitle')}</h2>
            <p className="text-gray-500 mb-8 text-sm">{t('board.emptyDesc')}</p>

            {!user && (
              <button
                onClick={handleSignIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-3.5 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mb-3"
              >
                <Cloud size={20} /> {t('board.signInButton')}
              </button>
            )}

            <button
              onClick={openNewForm}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3.5 px-6 rounded-xl shadow transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mb-3"
            >
              <Plus size={20} /> {t('board.addFirstButton', 'Add your first company')}
            </button>

            <button
              onClick={triggerFileInput}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"
            >
              <Upload size={16} /> {t('board.loadButton')}
            </button>

            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm py-2.5 px-6 rounded-xl border border-indigo-200 flex items-center justify-center gap-2 mb-4"
            >
              💡 {t('board.viewTutorial', 'View Tutorial')}
            </button>

            <div className="grid grid-cols-2 gap-3 text-left text-xs text-gray-500">
              <div className="bg-indigo-50 p-3 rounded-lg">
                <div className="font-bold text-indigo-700 mb-1 flex items-center gap-1"><Cloud size={12} /> {t('board.modeCloudTitle')}</div>
                <p>{t('board.modeCloudDesc')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-bold text-gray-700 mb-1 flex items-center gap-1"><Download size={12} /> {t('board.modeLocalTitle')}</div>
                <p>{t('board.modeLocalDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimeline = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          <Activity className="text-blue-600" /> {t('timeline.title')}
        </h2>
        {timelineEvents.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">{t('timeline.empty')}</div>
        ) : (
          <div className={`relative ${timelineBorder} border-blue-200 space-y-8`}>
            {timelineEvents.map((event, index) => (
              <div key={index} className="relative">
                <div className={`absolute ${timelineDot} top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm`}></div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded-md ${event.eventType === 'interview' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {event.eventType === 'interview' ? t('timeline.interview') : t('timeline.assignmentSubmission')}
                      </span>
                      <span className="font-bold text-gray-800">{safeStr(event.companyName)}</span>
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded">
                      {formatDate(event.date)}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{safeStr(event.type || event.task)}</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{safeStr(event.summary || event.notes)}</p>
                  {event.interviewer && (
                    <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
                      <User size={14} /> {t('timeline.interviewer')} {safeStr(event.interviewer)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStats = () => {
    const statCards = [
      { label: t('stats.total', 'Total Applications'), value: stats.total, color: 'text-blue-600' },
      { label: t('stats.active', 'Active'), value: stats.active, color: 'text-indigo-600' },
      { label: t('stats.responseRate', 'Response Rate'), value: `${stats.responseRate}%`, color: 'text-green-600' },
      { label: t('stats.interviews', 'Interviews'), value: stats.interviewCount, color: 'text-purple-600' },
    ];
    const maxCount = Math.max(...STATUSES.map(s => stats.byStatus[s.id] || 0), 1);

    // Application Journey funnel
    const JOURNEY_STAGES = [
      { id: 'applied',           label: 'Applied',   color: 'bg-blue-100 text-blue-800 border-blue-300' },
      { id: 'hr_call',           label: 'HR Call',   color: 'bg-purple-100 text-purple-800 border-purple-300' },
      { id: 'tech_interview',    label: 'Technical', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      { id: 'manager_interview', label: 'Manager',   color: 'bg-orange-100 text-orange-800 border-orange-300' },
      { id: 'offer',             label: 'Offer',     color: 'bg-green-100 text-green-800 border-green-300' },
    ];
    const FUNNEL_ORDER = ['applied', 'hr_call', 'tech_interview', 'manager_interview', 'offer'];
    const INTERVIEW_TYPE_TO_STAGE = {
      'Intro Call / HR': 'hr_call',
      'Technical Interview': 'tech_interview',
      'Manager Interview': 'manager_interview',
      'VP / CEO Interview': 'manager_interview',
      'Salary Offer': 'offer',
      'References Check': 'offer',
    };
    const funnelIdx = (id) => FUNNEL_ORDER.indexOf(id);
    const companiesReachedStage = (stageId) => {
      const idx = funnelIdx(stageId);
      return companies.filter(c => {
        if (funnelIdx(c.status) >= idx && funnelIdx(c.status) !== -1) return true;
        if (Array.isArray(c.interviews)) {
          for (const iv of c.interviews) {
            const mapped = INTERVIEW_TYPE_TO_STAGE[iv.type];
            if (mapped && funnelIdx(mapped) >= idx) return true;
          }
        }
        return false;
      }).length;
    };
    const journeyCounts = JOURNEY_STAGES.map(s => ({ ...s, count: companiesReachedStage(s.id) }));
    const hasJourneyData = journeyCounts[0].count > 0;

    // Avg days: first to last interview date for companies with >=2 dated interviews
    const companiesWithDates = companies.filter(c =>
      Array.isArray(c.interviews) && c.interviews.filter(i => i.date).length >= 2
    );
    let avgDays = null;
    if (companiesWithDates.length > 0) {
      const totalDays = companiesWithDates.reduce((acc, c) => {
        const dates = c.interviews.map(i => new Date(i.date)).filter(d => !isNaN(d.getTime()));
        if (dates.length < 2) return acc;
        const span = Math.round((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
        return acc + span;
      }, 0);
      avgDays = Math.round(totalDays / companiesWithDates.length);
    }

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 className="text-indigo-600" /> {t('stats.title', 'Statistics')}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
                {card.label === t('stats.responseRate', 'Response Rate') ? (
                  <Tooltip text={t('tooltips.responseRate')} position="top">
                    <div className={`text-3xl font-black mb-1 ${card.color}`}>{card.value}</div>
                  </Tooltip>
                ) : (
                  <div className={`text-3xl font-black mb-1 ${card.color}`}>{card.value}</div>
                )}
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Application Journey card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800">🔽 {t('stats.journey', 'Hiring Funnel')}</h3>
              {avgDays !== null && (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                  {t('stats.avgDays', 'Avg. days from first to last interview')}: <span className="font-bold text-gray-700">{avgDays}d</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-5">{t('stats.journeySubtitle', 'How many of your applications reached each stage — shows where most drop off')}</p>
            {!hasJourneyData ? (
              <div className="text-center text-gray-400 py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">
                {t('stats.noData', 'Add more companies to see patterns')}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                {journeyCounts.map((stage, i) => {
                  const prevCount = i > 0 ? journeyCounts[i - 1].count : null;
                  const pct = prevCount && prevCount > 0
                    ? Math.round((stage.count / prevCount) * 100)
                    : null;
                  return (
                    <React.Fragment key={stage.id}>
                      {i > 0 && (
                        <div className="flex flex-col items-center mx-1">
                          <span className="text-gray-400 text-lg leading-none">›</span>
                          {pct !== null && (
                            <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
                          )}
                        </div>
                      )}
                      <div className={`flex flex-col items-center px-3 py-2 rounded-lg border font-medium text-sm ${stage.color}`}>
                        <span className="font-bold">{stage.label}</span>
                        <span className="text-lg font-black leading-tight">{stage.count}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-5">{t('stats.byStatus', 'By Status')}</h3>
            <div className="space-y-3">
              {STATUSES.filter(s => (stats.byStatus[s.id] || 0) > 0).map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-600 flex-shrink-0 truncate">{t(`status.${s.id}`)}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${s.color.split(' ')[0]}`}
                      style={{ width: `${((stats.byStatus[s.id] || 0) / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-6 text-sm font-bold text-gray-700 text-right">{stats.byStatus[s.id] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-orange-500" />
                {t('stats.upcoming', 'Upcoming — Next 14 Days')}
              </h3>
              <div className="space-y-3">
                {upcomingEvents.map((event, i) => {
                  const days = getDaysUntil(event.date);
                  return (
                    <div key={`${event.companyName}-${event.date}`} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className={`text-center px-3 py-1 rounded-lg font-bold text-sm flex-shrink-0 min-w-[48px] ${days === 0 ? 'bg-red-500 text-white' : days <= 2 ? 'bg-orange-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {days === 0 ? t('stats.today', 'Today') : `+${days}d`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 truncate">{safeStr(event.companyName)}</div>
                        <div className="text-sm text-gray-600 truncate">{safeStr(event.type || event.task)}</div>
                      </div>
                      <div className="text-sm text-gray-400 flex-shrink-0">{formatDate(event.date)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold">
          {toastMessage}
        </div>
      )}

      <header className={`bg-gradient-to-r ${isRTL ? 'from-indigo-800 to-blue-700' : 'from-blue-700 to-indigo-800'} text-white shadow-md flex-shrink-0`}>
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                {t('header.title')}
                {companies.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${isSaved ? 'bg-green-500/20 text-green-100' : 'bg-yellow-500/50 text-yellow-50'}`}>
                    {isSaved ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {isSaved ? t('header.savedInBrowser') : t('header.saving')}
                  </span>
                )}
              </h1>
              <p className="text-blue-200 text-sm">{t('header.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!shareMode && (
              <button onClick={openNewForm} className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
                <Plus size={18} /> {t('header.addCompany')}
              </button>
            )}

            {user ? (
              <button
                onClick={handleSignOut}
                title={t('header.driveOnTooltip')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${syncing ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-100' : 'bg-green-500/20 border-green-400/30 text-green-100 hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-100'}`}
              >
                <Cloud size={16} className={syncing ? 'animate-pulse' : ''} />
                {syncing ? t('header.driveSyncing') : user.displayName?.split(' ')[0] || t('header.driveOn')}
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                title={t('header.connectDriveTooltip')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-blue-100 transition-colors"
              >
                <CloudOff size={16} /> {t('header.connectDrive')}
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <Languages size={16} className="text-blue-100 flex-shrink-0" />
              <select
                value={i18n.language}
                onChange={e => { i18n.changeLanguage(e.target.value); localStorage.setItem('appLanguage', e.target.value); }}
                className="bg-transparent text-blue-100 text-sm font-bold border-none outline-none cursor-pointer"
              >
                <option value="en" className="text-gray-800">English</option>
                <option value="he" className="text-gray-800">עברית</option>
                <option value="fr" className="text-gray-800">Français</option>
              </select>
            </div>

            <div className="flex bg-white/10 rounded-lg p-1">
              <button onClick={handleExport} title={t('header.downloadTooltip')} className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded text-white transition-colors border border-green-400/30">
                <Download size={18} />
              </button>
              <label className="p-2 hover:bg-white/20 rounded text-white transition-colors cursor-pointer" title={t('header.uploadTooltip')}>
                <Upload size={18} />
                <input id="main-file-upload" type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                onClick={() => setShowTemplates(true)}
                title={t('templates.title', 'Interview Templates')}
                className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              >
                📚
              </button>
              {user && !shareMode && (
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}${window.location.pathname}?share=${user.uid}`;
                    publishShare(user.uid, companies).catch(console.error);
                    try {
                      await navigator.clipboard.writeText(url);
                      showToast(t('toast.shareCopied', 'Share link copied!'));
                    } catch {
                      window.prompt(t('header.shareTooltip', 'Share read-only link') + ':', url);
                    }
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 3000);
                  }}
                  title={t('header.shareTooltip', 'Share read-only link')}
                  className={`p-2 rounded text-white transition-colors ${shareCopied ? 'bg-green-500/40' : 'hover:bg-white/20'}`}
                >
                  {shareCopied ? '✓' : '🔗'}
                </button>
              )}
              <button
                onClick={() => setShowAISettings(true)}
                title={t('header.aiSettings', 'AI Settings')}
                className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex px-6 gap-2 mt-2">
          {[
            { key: 'board', icon: <Layout size={16} /> },
            { key: 'list', icon: <List size={16} /> },
            { key: 'timeline', icon: <Calendar size={16} /> },
            { key: 'stats', icon: <BarChart2 size={16} /> },
          ].map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === key ? 'bg-gray-50 text-indigo-800' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}
            >
              {icon} {t(`tabs.${key}`, key)}
            </button>
          ))}
        </div>
      </header>

      {shareMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-800 text-sm">
          <span>👁️</span>
          <span className="font-medium">{t('header.viewOnly', 'View only')} —</span>
          <span>{t('header.viewOnlyDesc', 'You are viewing a shared read-only snapshot.')}</span>
        </div>
      )}

      {activeTab === 'board' && renderBoard()}
      {activeTab === 'timeline' && renderTimeline()}
      {activeTab === 'stats' && renderStats()}

      {activeTab === 'list' && (
        <div className="flex flex-1 overflow-hidden">
          <div className={`w-full md:w-1/3 lg:w-1/4 flex-shrink-0 bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 flex-col ${selectedId || isEditing ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 text-gray-400`} size={18} />
                <input
                  type="text"
                  placeholder={t('list.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm`}
                />
              </div>
              <div className="relative">
                <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 text-gray-400`} size={16} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm`}
                >
                  <option value="all">{t('list.allStatuses')}</option>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{t(`status.${s.id}`)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredCompanies.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">{t('list.noResults')}</div>
              ) : (
                <>
                  {filteredCompanies.slice(0, visibleCount).map(company => {
                    const statusInfo = STATUSES.find(s => s.id === company.status);
                    const priorityInfo = PRIORITIES.find(p => p.id === company.priority);
                    const isSelected = selectedId === company.id;
                    return (
                      <div
                        key={company.id}
                        onClick={() => selectCompany(company)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm border ring-1 ring-indigo-500' : 'hover:bg-gray-50 border border-transparent'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(company.name)}`}>
                            {getInitials(company.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-gray-900 truncate">{safeStr(company.name)}</h3>
                              {priorityInfo && <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityInfo.color}`}></div>}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{safeStr(company.role)}</p>
                            <div className="mt-1.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusInfo?.color || 'bg-gray-100 border-gray-200'}`}>
                                {statusInfo ? t(`status.${statusInfo.id}`) : t('status.unknown')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {visibleCount < filteredCompanies.length && (
                    <button
                      onClick={() => setVisibleCount(n => n + 25)}
                      className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors font-medium"
                    >
                      {t('list.loadMore', 'Load more')} ({filteredCompanies.length - visibleCount} {t('list.remaining', 'remaining')})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={`flex-1 flex-col bg-slate-50 overflow-y-auto relative custom-scrollbar ${!selectedId && !isEditing ? 'hidden md:flex' : 'flex'}`}>
            {(selectedId || isEditing) && (
              <div className="md:hidden sticky top-0 bg-white/90 backdrop-blur-sm p-3 border-b border-gray-200 z-10">
                <button onClick={() => { setSelectedId(null); setIsEditing(false); }} className="flex items-center gap-2 text-indigo-600 font-bold">
                  <BackArrow size={18} /> {t('list.backToList')}
                </button>
              </div>
            )}

            {isEditing ? (
              <div className="p-6 max-w-4xl mx-auto w-full pb-20">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {formData.id ? t('form.editTitle') : t('form.addTitle')}
                    </h2>
                    <div className="flex gap-2">
                      <button onClick={() => formData.id ? setIsEditing(false) : setSelectedId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">{t('form.cancel')}</button>
                      <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition">{t('form.save')}</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.companyName')}</label>
                      <input type="text" value={safeStr(formData.name)} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.role')}</label>
                      <input type="text" value={safeStr(formData.role)} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.processStatus')}</label>
                      <select value={formData.status || 'applied'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{t(`status.${s.id}`)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.priority')}</label>
                      <Tooltip text={t('tooltips.priority')} position="top">
                        <select value={formData.priority || 'medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{t(`priority.${p.id}`)}</option>)}
                        </select>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-8">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Globe size={18} /> {t('form.linksSection')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input type="text" placeholder={t('form.websitePlaceholder')} value={safeStr(formData.website)} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                      <input type="text" placeholder={t('form.linkedinPlaceholder')} value={safeStr(formData.linkedinCompany)} onChange={e => setFormData({...formData, linkedinCompany: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                      <input type="text" placeholder={t('form.locationPlaceholder')} value={safeStr(formData.location)} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                    </div>
                    <textarea placeholder={t('form.descriptionPlaceholder')} value={safeStr(formData.description)} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md h-20 resize-none"></textarea>
                  </div>

                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><User size={18} /> {t('form.interviews')}</h3>
                      <button
                        onClick={() => setFormData({...formData, interviews: [...(formData.interviews || []), { type: 'Intro Call / HR', date: '', interviewer: '', summary: '' }]})}
                        className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
                      >
                        <Plus size={16} /> {t('form.addInterview')}
                      </button>
                    </div>
                    {(formData.interviews || []).map((interview, index) => (
                      <div key={index} className="bg-white p-4 border border-gray-200 rounded-lg mb-3 shadow-sm relative">
                        <button
                          onClick={() => { const a = [...formData.interviews]; a.splice(index, 1); setFormData({...formData, interviews: a}); }}
                          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-gray-400 hover:text-red-500`}
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 ${isRTL ? 'pr-6' : 'pl-6'}`}>
                          <Tooltip text={t('tooltips.interviewType')} position="top">
                            <select
                              value={safeStr(interview.type)}
                              onChange={e => { const a = [...formData.interviews]; a[index].type = e.target.value; setFormData({...formData, interviews: a}); }}
                              className="w-full p-2 text-sm border rounded bg-white"
                            >
                              <option value="" disabled>{t('form.selectInterviewType')}</option>
                              {INTERVIEW_TYPE_KEYS.map(key => <option key={key} value={key}>{t(`interviewType.${key}`, key)}</option>)}
                              {interview.type && !INTERVIEW_TYPE_KEYS.includes(interview.type) && <option value={safeStr(interview.type)}>{safeStr(interview.type)}</option>}
                            </select>
                          </Tooltip>
                          <input type="date" value={safeStr(interview.date)} onChange={e => { const a = [...formData.interviews]; a[index].date = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded" />
                          <input type="text" placeholder={t('form.interviewerPlaceholder')} value={safeStr(interview.interviewer)} onChange={e => { const a = [...formData.interviews]; a[index].interviewer = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded" />
                        </div>
                        <textarea placeholder={t('form.summaryPlaceholder')} value={safeStr(interview.summary)} onChange={e => { const a = [...formData.interviews]; a[index].summary = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded h-16"></textarea>
                      </div>
                    ))}
                  </div>

                  {['rejected', 'ghosted'].includes(formData.status) && (
                    <div className="mb-8 bg-red-50 p-5 rounded-xl border border-red-100">
                      <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} /> {t('form.rejectionTitle', 'Rejection Details')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.rejectionDate', 'Rejection Date')}</label>
                          <input
                            type="date"
                            value={safeStr(formData.rejection?.date)}
                            onChange={e => setFormData({...formData, rejection: {...(formData.rejection || {}), date: e.target.value}})}
                            className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.rejectionMethod', 'How Were You Notified')}</label>
                          <Tooltip text={t('tooltips.rejectionMethod')} position="top">
                            <select
                              value={safeStr(formData.rejection?.method)}
                              onChange={e => setFormData({...formData, rejection: {...(formData.rejection || {}), method: e.target.value}})}
                              className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                            >
                              <option value="">{t('form.rejectionMethodSelect', 'Select...')}</option>
                              {REJECTION_METHOD_KEYS.map(key => <option key={key} value={key}>{t(`rejectionMethod.${key}`, key)}</option>)}
                            </select>
                          </Tooltip>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">{t('form.rejectionNotes', 'Notes / Feedback')}</label>
                        <textarea
                          value={safeStr(formData.rejection?.notes)}
                          onChange={e => setFormData({...formData, rejection: {...(formData.rejection || {}), notes: e.target.value}})}
                          className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 h-20 resize-none"
                          placeholder={t('form.rejectionNotesPlaceholder', 'What was the feedback?')}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">{t('form.notes')}</h3>
                    <textarea value={safeStr(formData.generalNotes)} onChange={e => setFormData({...formData, generalNotes: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-indigo-500" placeholder={t('form.notesPlaceholder')}></textarea>
                  </div>
                </div>
              </div>

            ) : selectedId ? (
              <div className="max-w-5xl mx-auto w-full">
                {(() => {
                  const company = formData;
                  const statusInfo = STATUSES.find(s => s.id === company.status);
                  const priorityInfo = PRIORITIES.find(p => p.id === company.priority);
                  const bgColorClass = getAvatarColor(company.name).replace('-500', '-50');
                  const journeySteps = getJourneySteps(company);
                  const isRejected = ['rejected', 'ghosted'].includes(company.status);
                  return (
                    <div>
                      <div className={`p-8 border-b border-gray-200 ${bgColorClass}`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex items-center gap-5">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md ${getAvatarColor(company.name)}`}>
                              {getInitials(company.name)}
                            </div>
                            <div>
                              <h1 className="text-3xl font-bold text-gray-900 mb-1">{safeStr(company.name)}</h1>
                              <p className="text-lg text-gray-700">{safeStr(company.role)}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${statusInfo?.color || 'bg-gray-100 border-gray-200'}`}>
                                  {statusInfo ? t(`status.${statusInfo.id}`) : t('status.unknown')}
                                </span>
                                {priorityInfo && (
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${priorityInfo.color}`}>
                                    {t(`priority.${priorityInfo.id}`)} {t('detail.priorityLabel')}
                                  </span>
                                )}
                                {company.location && (
                                  <span className="px-3 py-1 rounded-full text-sm bg-white border border-gray-200 text-gray-600 flex items-center gap-1">
                                    <MapPin size={14} /> {safeStr(company.location)}
                                  </span>
                                )}
                              </div>
                              {journeySteps.length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-1">
                                  {journeySteps.map((step, i) => (
                                    <React.Fragment key={i}>
                                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${isRejected ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {t(`interviewType.${step}`, step)}
                                      </span>
                                      {i < journeySteps.length - 1 && <span className="text-gray-400 text-xs">›</span>}
                                    </React.Fragment>
                                  ))}
                                  {isRejected && (
                                    <>
                                      <span className="text-gray-400 text-xs">›</span>
                                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-200 text-red-700">
                                        {t(`status.${company.status}`)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium">
                              <Edit2 size={16} /> {t('detail.editDetails')}
                            </button>
                            <button onClick={() => handleDelete(company.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition" title={t('detail.deleteCompany')}>
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-4">
                          {company.website && typeof company.website === 'string' && (
                            <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Globe size={14} /> {t('detail.companyWebsite')}
                            </a>
                          )}
                          {company.linkedinCompany && typeof company.linkedinCompany === 'string' && (
                            <a href={company.linkedinCompany.startsWith('http') ? company.linkedinCompany : `https://${company.linkedinCompany}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Linkedin size={14} /> {t('detail.companyLinkedin')}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                          {(company.description || company.products) && (
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                              <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">{t('detail.aboutTitle')}</h3>
                              {company.description && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{t('detail.whatTheyDo')}</h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">{safeStr(company.description)}</p>
                                </div>
                              )}
                              {company.products && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{t('detail.products')}</h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">{safeStr(company.products)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {isRejected && company.rejection && (company.rejection.date || company.rejection.method || company.rejection.notes) && (
                            <div className="bg-red-50 p-5 rounded-xl shadow-sm border border-red-100">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-red-800 flex items-center gap-2">
                                  <AlertTriangle size={18} /> {t('detail.rejectionTitle', 'Rejection Details')}
                                </h3>
                                <button
                                  onClick={() => setRejectionCompany(company)}
                                  className="text-xs px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors flex items-center gap-1"
                                >
                                  ✨ {t('detail.analyzeRejection', 'Analyze with AI')}
                                </button>
                              </div>
                              {company.rejection.date && (
                                <div className="mb-2 text-sm text-gray-700">
                                  <span className="font-bold text-gray-500">{t('form.rejectionDate', 'Date')}: </span>
                                  {formatDate(company.rejection.date)}
                                </div>
                              )}
                              {company.rejection.method && (
                                <div className="mb-2 text-sm text-gray-700">
                                  <span className="font-bold text-gray-500">{t('form.rejectionMethod', 'How')}: </span>
                                  {t(`rejectionMethod.${company.rejection.method}`, company.rejection.method)}
                                </div>
                              )}
                              {company.rejection.notes && (
                                <div className="mt-3 text-sm text-gray-700 bg-white p-3 rounded-lg border border-red-100 whitespace-pre-wrap">
                                  {safeStr(company.rejection.notes)}
                                </div>
                              )}
                            </div>
                          )}

                          {company.generalNotes && (
                            <div className="bg-yellow-50 p-5 rounded-xl shadow-sm border border-yellow-100">
                              <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                <CheckCircle size={18} /> {t('detail.personalNotes')}
                              </h3>
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">{safeStr(company.generalNotes)}</p>
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-6 text-xl border-b pb-3 flex items-center gap-2">
                              <User size={20} className="text-indigo-600" /> {t('detail.processHistory')}
                            </h3>
                            {company.interviews && Array.isArray(company.interviews) && company.interviews.length > 0 ? (
                              <div className={`relative ${timelineBorder} border-indigo-100 space-y-6`}>
                                {company.interviews.map((interview, idx) => (
                                  <div key={idx} className="relative">
                                    <div className={`absolute ${timelineDot} top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white`}></div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900">
                                          {interview.type ? t(`interviewType.${interview.type}`, interview.type) : t('detail.processStage')}
                                        </h4>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded flex items-center gap-1">
                                          <Calendar size={12} /> {formatDate(interview.date)}
                                        </span>
                                      </div>
                                      {interview.interviewer && (
                                        <p className="text-sm text-gray-500 mb-2">{t('timeline.interviewer')} {safeStr(interview.interviewer)}</p>
                                      )}
                                      {interview.summary && (
                                        <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-100 whitespace-pre-wrap mt-2">
                                          {safeStr(interview.summary)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                {t('detail.noInterviews')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50 hidden md:flex">
                <Layout size={64} className="mb-4 text-gray-300" />
                <p className="text-xl font-bold mb-2 text-gray-500">{t('detail.selectCompany')}</p>
                <p className="text-sm mt-2">{t('detail.selectCompanyHint')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #94a3b8; }
      `}} />

      {showOnboarding && (
        <Onboarding
          t={t}
          i18n={i18n}
          isRTL={isRTL}
          onClose={() => setShowOnboarding(false)}
          openNewForm={() => { setShowOnboarding(false); openNewForm(); }}
          triggerFileInput={() => { setShowOnboarding(false); triggerFileInput(); }}
          openAISettings={() => { setShowOnboarding(false); setShowAISettings(true); }}
        />
      )}

      {showAISettings && (
        <APIKeySettings t={t} onClose={() => setShowAISettings(false)} />
      )}

      {showTemplates && (
        <TemplateLibrary
          t={t}
          onClose={() => setShowTemplates(false)}
          onStartSimulation={handleStartSimulation}
        />
      )}

      {rejectionCompany && (
        <RejectionAnalysis
          company={rejectionCompany}
          language={i18n.language}
          t={t}
          onClose={() => setRejectionCompany(null)}
          onOpenSettings={() => { setRejectionCompany(null); setShowAISettings(true); }}
          onSave={handleRejectionNoteSave}
        />
      )}

      <AIAssistant
        company={selectedId ? formData : null}
        companies={companies}
        language={i18n.language}
        t={t}
        onOpenSettings={() => setShowAISettings(true)}
        onSaveToCompany={selectedId ? handleSaveToCompany : null}
      />

      {simulationData && (
        <ChatModal
          t={t}
          language={i18n.language}
          systemPromptOverride={simulationData.systemPrompt}
          simulationTitle={simulationData.title}
          onClose={() => setSimulationData(null)}
          onOpenSettings={() => { setSimulationData(null); setShowAISettings(true); }}
        />
      )}
    </div>
  );
}
