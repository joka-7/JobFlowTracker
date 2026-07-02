import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, MapPin, Globe, Calendar,
  User, CheckCircle, Clock, Trash2, Edit2,
  ArrowLeft, ArrowRight, Download, Upload, Layout, List, Activity, AlertTriangle,
  Cloud, CloudOff, Languages, BarChart2, Settings, MoreVertical, Smartphone, RefreshCw
} from 'lucide-react';
import {
  signInWithGoogle, signOut, onAuthChange, loadAllItems, updateItem, deleteItem,
  batchSaveItems, loadUserProfile, saveUserProfile, formatSignInError,
} from './firebase';
import { initAI, getJobFinderSystemPrompt, getCandidateFinderSystemPrompt } from './services/aiAssistant';
import {
  getStatuses, getTerminalStatuses, getRejectedStatuses, getFunnelOrder, getFunnelGroups,
  getStorageKey, INTERVIEW_TYPE_KEYS, filterItemsForMode,
} from './statuses';
import Onboarding from './components/Onboarding';
import AppBrandMark from './components/AppBrandMark';
import CardColorPicker from './components/CardColorPicker';
import { STORAGE_KEYS } from './storageKeys.js';
import AIAssistant from './components/AIAssistant';
import APIKeySettings from './components/APIKeySettings';
import RejectionAnalysis from './components/RejectionAnalysis';
import TemplateLibrary from './components/TemplateLibrary';
import ChatModal from './components/ChatModal';
import Tooltip from './components/Tooltip';
import ModeDropdown from './components/ModeDropdown';
import CalendarView from './components/CalendarView';
import SearchFilter from './components/SearchFilter';
import BulkActionsBar from './components/BulkActionsBar';
import { TEMPLATES } from './data/interviewTemplates';
import {
  getLocalizedQuestions, getLocalizedCategoryLabel, formatQuestionList,
} from './utils/templateQuestions';
import { usePwaInstall } from './usePwaInstall';
import { sanitizeTrackerRecords, parseTrackerImportPayload } from './sanitize';
import { saveJsonFile } from './utils/saveFile';

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

const safeUrl = (val) => {
  try {
    const str = safeStr(val).trim();
    if (!str) return null;
    const withScheme = /^https?:\/\//i.test(str) ? str : `https://${str}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch { return null; }
};

const PRIORITIES = [
  { id: 'high', color: 'bg-red-500' },
  { id: 'medium', color: 'bg-orange-500' },
  { id: 'low', color: 'bg-blue-500' },
];

const REJECTION_METHOD_KEYS = [
  'Automatic Email',
  'Personal Email',
  'Phone Call',
  'Message',
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

const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

const makeInitialFormState = (isRecruiter) => ({
  name: '', role: '', location: '', status: 'applied', priority: 'medium',
  website: '', linkedinCompany: '', linkedinHR: '', description: '', products: '',
  linkedinCandidate: '', currentRole: '', expectedSalary: '', source: '',
  companySize: '', companySector: '', applicationSource: '',
  interviews: [], homeworks: [], contacts: [], generalNotes: '',
  rejection: { date: '', method: '', notes: '' },
  cardColor: '',
  ...(isRecruiter ? {} : {}),
});

export default function JobTrackerApp({ mode = 'jobseeker', onModeChange, autoOnboarding = true }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const isRecruiter = mode === 'recruiter';
  const STATUSES = getStatuses(mode);
  const rejectedStatuses = getRejectedStatuses(mode);
  const terminalStatuses = getTerminalStatuses(mode);

  const tMode = (key, fallback) => t(isRecruiter ? `recruiter.${key}` : key, fallback);
  const tStatus = (id) => t(isRecruiter ? `recruiter.status.${id}` : `status.${id}`);
  const tInterviewType = (key) => t(isRecruiter ? `recruiter.interviewType.${key}` : `interviewType.${key}`, key);

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
      const saved = window.localStorage.getItem(getStorageKey(mode));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeTrackerRecords(parsed);
          return filterItemsForMode(sanitized, mode);
        }
      }
      return [];
    } catch { return []; }
  });

  const [selectedId, setSelectedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const [activeTab, setActiveTab] = useState('board');
  const [toastMessage, setToastMessage] = useState('');

  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const dragCompanyId = useRef(null);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    const key = isRecruiter ? STORAGE_KEYS.recruiterOnboarding : STORAGE_KEYS.jobSeekerOnboarding;
    return !localStorage.getItem(key);
  });
  const [showAISettings, setShowAISettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [simulationData, setSimulationData] = useState(null); // { systemPrompt, title }
  const [showAIFinder, setShowAIFinder] = useState(false);
  const [rejectionCompany, setRejectionCompany] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { canInstall, runInstall } = usePwaInstall();

  // UX Improvements: Search, Filter, Bulk Actions
  const [searchText, setSearchText] = useState('');
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    const provider = localStorage.getItem('aiProvider') || 'gemini';
    const apiKey = localStorage.getItem('aiApiKey') || localStorage.getItem('anthropicApiKey') || '';
    const model = localStorage.getItem('aiModel') || '';
    const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
    initAI(provider, apiKey, model, ollamaUrl);
  }, [isRecruiter]);

  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    try {
      const saved = window.localStorage.getItem(getStorageKey(mode));
      if (!saved) {
        setCompanies([]);
      } else {
        try {
          const parsed = JSON.parse(saved);
          const sanitized = Array.isArray(parsed) ? sanitizeTrackerRecords(parsed) : [];
          setCompanies(filterItemsForMode(sanitized, mode));
        } catch {
          setCompanies([]);
        }
      }
    } catch { setCompanies([]); }
    setSelectedId(null);
    setIsEditing(false);
    setFormData(makeInitialFormState(mode === 'recruiter'));
    setFilterStatuses([]);
    setSearchText('');
    setActiveTab('board');
    setShowOnboarding(mode !== 'recruiter' && !localStorage.getItem(STORAGE_KEYS.jobSeekerOnboarding));
  }, [mode]);

  const initialFormState = makeInitialFormState(isRecruiter);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    try {
      if (companies.length > 0) {
        setIsSaved(false);
        window.localStorage.setItem(getStorageKey(mode), JSON.stringify(companies));
        const timer = setTimeout(() => setIsSaved(true), 800);
        return () => clearTimeout(timer);
      }
    } catch (e) { console.warn('LocalStorage error:', e); }
  }, [companies, mode]);

  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setSyncing(true);
        try {
          await saveUserProfile(firebaseUser.uid, { appMode: mode });
          const data = await loadAllItems(firebaseUser.uid, mode);
          if (data && data.length > 0) {
            setCompanies(filterItemsForMode(sanitizeTrackerRecords(data), mode));
            showToast(tMode('toast.driveConnectedWithData'));
          } else {
            showToast(tMode('toast.driveConnectedEmpty'));
          }
        } catch (e) { console.error(e); }
        setSyncing(false);
      }
    });
    return unsub;
  }, [mode]);

  useEffect(() => {
    const handleVisibility = async () => {
      const firebaseUser = userRef.current;
      if (document.visibilityState === 'visible' && firebaseUser) {
        setSyncing(true);
        try {
          const data = await loadAllItems(firebaseUser.uid, mode);
          if (data && data.length > 0) setCompanies(filterItemsForMode(sanitizeTrackerRecords(data), mode));
        } catch (e) { console.error(e); }
        setSyncing(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [mode]);

  const openNewForm = useCallback(() => {
    setFormData(makeInitialFormState(isRecruiter));
    setSelectedId(null);
    setIsEditing(true);
    setActiveTab('list');
  }, [isRecruiter]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') openNewForm();
      if (e.key === 'Escape') { setSelectedId(null); setIsEditing(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openNewForm]);

  // Browser back/forward support
  const navigateTo = useCallback((tab, companyId = null) => {
    const state = { tab, selectedId: companyId };
    window.history.pushState(state, '');
    setActiveTab(tab);
    if (companyId) {
      setSelectedId(companyId);
      setIsEditing(false);
    }
  }, []);

  useEffect(() => {
    // Ensure the bottom-most entry has a null state (the "exit" sentinel below),
    // so popstate's `if (!s)` branch can catch it and re-arm instead of letting
    // the back gesture leave the document entirely.
    window.history.replaceState(null, '');
    window.history.pushState({ tab: activeTab, selectedId }, '');

    const onPop = (e) => {
      const s = e.state;
      if (!s) {
        // Reached the bottom of the stack (e.g. mobile back gesture trying to exit) —
        // re-arm a history entry and fall back to the board instead of letting the app close.
        window.history.pushState({ tab: 'board', selectedId: null }, '');
        setActiveTab('board');
        setSelectedId(null);
        setIsEditing(false);
        return;
      }
      setActiveTab(s.tab || 'board');
      setSelectedId(s.selectedId || null);
      setIsEditing(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async () => {
    try {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    } catch (e) {
      console.error('Google sign-in failed:', e);
      showToast(formatSignInError(e));
    }
  };

  const handleSignOut = () => {
    signOut();
    showToast(tMode('toast.driveDisconnected'));
  };

  const handleSyncNow = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const data = await loadAllItems(user.uid, mode);
      if (data && data.length > 0) setCompanies(filterItemsForMode(sanitizeTrackerRecords(data), mode));
    } catch (e) { console.error(e); }
    setSyncing(false);
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const nameStr = safeStr(c.name || c.company).toLowerCase();
      const roleStr = safeStr(c.role || c.position).toLowerCase();
      const locationStr = safeStr(c.location).toLowerCase();

      const searchStr = safeStr(searchText).toLowerCase();
      const matchSearch = !searchStr || nameStr.includes(searchStr) ||
                          roleStr.includes(searchStr) ||
                          locationStr.includes(searchStr);

      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(safeStr(c.status));

      return matchSearch && matchStatus;
    });
  }, [companies, searchText, filterStatuses]);

  useEffect(() => {
    setVisibleCount(25);
  }, [searchText, filterStatuses]);

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

  const calendarEvents = useMemo(() => {
    const evs = [];
    companies.forEach(company => {
      const cName = safeStr(company.name || company.company || t('alert.noName'));
      if (Array.isArray(company.interviews)) {
        company.interviews.forEach(iv => {
          if (iv && iv.date)
            evs.push({ date: iv.date, title: `${cName} – ${iv.type ? tInterviewType(iv.type) : ''}`, type: 'interview', parentId: company.id });
        });
      }
      if (Array.isArray(company.homeworks)) {
        company.homeworks.forEach(hw => {
          if (hw && hw.deadline)
            evs.push({ date: hw.deadline, title: `${cName} – ${hw.title || t('timeline.assignmentSubmission')}`, type: 'assignment', parentId: company.id });
        });
      }
    });
    return evs;
  }, [companies, i18n.language]);

  const stats = useMemo(() => {
    const total = companies.length;
    const byStatus = {};
    STATUSES.forEach(s => { byStatus[s.id] = companies.filter(c => c.status === s.id).length; });
    const active = companies.filter(c => !terminalStatuses.includes(c.status)).length;
    const responded = companies.filter(c => c.status !== 'applied' && c.status !== 'ghosted').length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const interviewCount = companies.reduce((acc, c) => acc + (Array.isArray(c.interviews) ? c.interviews.length : 0), 0);
    return { total, byStatus, active, responseRate, interviewCount };
  }, [companies, STATUSES, terminalStatuses]);

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
    if (!formData.name) { alert(tMode('form.requiredName')); return; }
    const dataToSave = {
      ...formData,
      rejection: rejectedStatuses.includes(formData.status)
        ? (formData.rejection || { date: '', method: '', notes: '' })
        : { date: '', method: '', notes: '' },
    };
    if (dataToSave.id) {
      setCompanies(companies.map(c => String(c.id) === String(dataToSave.id) ? dataToSave : c));
      if (user) updateItem(user.uid, mode, dataToSave).catch(console.error);
    } else {
      const newCompany = { ...dataToSave, id: Date.now().toString() };
      setCompanies([newCompany, ...companies]);
      setSelectedId(newCompany.id);
      setFormData({
        ...initialFormState,
        ...newCompany,
        rejection: newCompany.rejection || { date: '', method: '', notes: '' },
      });
      if (user) updateItem(user.uid, mode, newCompany).catch(console.error);
    }
    setIsEditing(false);
    showToast(tMode('toast.saved'));
  };

  const handleDelete = (id) => {
    if (window.confirm(tMode('alert.deleteConfirm'))) {
      setCompanies(prev => prev.filter(c => String(c.id) !== String(id)));
      setSelectedId(null);
      setIsEditing(false);
      showToast(tMode('toast.deleted'));
      if (user) deleteItem(user.uid, mode, id).catch(console.error);
    }
  };

  const toggleItemSelected = (id) => {
    const key = String(id);
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelectedItems(new Set());

  const handleBulkDelete = () => {
    const ids = selectedItems;
    setCompanies(prev => prev.filter(c => !ids.has(String(c.id))));
    if (selectedId && ids.has(String(selectedId))) {
      setSelectedId(null);
      setIsEditing(false);
    }
    if (user) ids.forEach(id => deleteItem(user.uid, mode, id).catch(console.error));
    clearSelection();
    showToast(tMode('toast.deleted'));
  };

  const handleBulkStatusUpdate = (statusId) => {
    const ids = selectedItems;
    const updated = companies.map(c => ids.has(String(c.id)) ? { ...c, status: statusId } : c);
    setCompanies(updated);
    if (user) batchSaveItems(user.uid, mode, updated.filter(c => ids.has(String(c.id)))).catch(console.error);
    clearSelection();
    showToast(tMode('toast.saved'));
  };

  const handleBulkExport = async () => {
    const selected = companies.filter(c => selectedItems.has(String(c.id)));
    const name = `${isRecruiter ? 'recruiter-tracker' : 'job-tracker'}-selection-${new Date().toISOString().split('T')[0]}.json`;
    if (await saveJsonFile(name, selected)) showToast(tMode('toast.exported'));
  };

  const handleSaveToCompany = useCallback((companyId, text) => {
    const target = companies.find(c => String(c.id) === String(companyId));
    if (!target) return;
    const updated = {
      ...target,
      generalNotes: target.generalNotes ? `${target.generalNotes}\n\n---\n${text}` : text,
    };
    setCompanies(prev => prev.map(c => String(c.id) === String(companyId) ? updated : c));
    if (user) updateItem(user.uid, mode, updated).catch(console.error);
  }, [companies, user, mode]);

  const handleDeleteInterview = useCallback((companyId, interviewIndex) => {
    if (!window.confirm(tMode('detail.deleteInterviewConfirm'))) return;
    const target = companies.find(c => String(c.id) === String(companyId));
    if (!target || !Array.isArray(target.interviews)) return;
    const updated = { ...target, interviews: target.interviews.filter((_, i) => i !== interviewIndex) };
    setCompanies(prev => prev.map(c => String(c.id) === String(companyId) ? updated : c));
    if (user) updateItem(user.uid, mode, updated).catch(console.error);
    showToast(tMode('toast.deleted'));
  }, [companies, user, mode, showToast, tMode]);

  const handleRejectionNoteSave = useCallback((text) => {
    if (!rejectionCompany) return;
    const target = companies.find(c => c.id === rejectionCompany.id);
    if (!target) return;
    const updated = {
      ...target,
      generalNotes: target.generalNotes ? `${target.generalNotes}\n\n---\n${text}` : text,
    };
    setCompanies(prev => prev.map(c => c.id === rejectionCompany.id ? updated : c));
    if (user) updateItem(user.uid, mode, updated).catch(console.error);
  }, [companies, user, rejectionCompany, mode]);

  const handleStartSimulation = useCallback((categoryKey) => {
    const cat = TEMPLATES[categoryKey];
    if (!cat) return;
    const isQuestionsToAsk = categoryKey === 'questions_to_ask';
    const label = getLocalizedCategoryLabel(t, false, categoryKey, cat.label);
    const questions = getLocalizedQuestions(t, false, categoryKey, cat.questions);
    const questionList = formatQuestionList(questions);
    let systemPrompt;
    if (isRecruiter) {
      systemPrompt = `You are a realistic job candidate being interviewed for a software/tech role. The user is the interviewer practicing conducting a ${label} interview.

Use these questions as a guide for what the interviewer may ask:
${questionList}

Rules:
- Answer each question as a real candidate would: confident but honest, with some strengths and minor areas to grow
- Keep answers to 2-4 sentences — realistic, not perfect
- After each answer, briefly note (in parentheses) one thing the interviewer could follow up on
- Stay in character throughout
- When the user says "begin", introduce yourself briefly as the candidate and wait for the first question`;
    } else if (isQuestionsToAsk) {
      systemPrompt = `You are a friendly, experienced hiring manager. The user is practicing asking insightful questions during a job interview.

They may ask you any of these questions (in any order or their own phrasing):
${questionList}

Rules:
- Answer each question as a real hiring manager would (2-3 sentences, specific and honest)
- After answering, give one brief tip on what made the question strong or how to phrase it better
- Stay in character throughout
- When the user says "begin", introduce yourself briefly and invite the first question`;
    } else {
      systemPrompt = `You are a professional interviewer running a ${label} mock interview practice session.

Ask these questions one at a time:
${questionList}

Rules:
- Ask ONE question at a time
- After the user answers, give 2-3 sentences of feedback: start with what was good, then one specific improvement
- Then ask the next question
- After all questions, give a short overall assessment (3-4 sentences)
- Keep a professional but encouraging tone
- When the user says "begin", introduce the session in one sentence and ask question 1`;
    }

    setSimulationData({
      systemPrompt,
      title: `${cat.icon} ${label}`,
    });
    setShowTemplates(false);
  }, [isRecruiter, t]);

  const handleExport = async () => {
    const name = `${isRecruiter ? 'recruiter-tracker' : 'job-tracker'}-backup-${new Date().toISOString().split('T')[0]}.json`;
    if (await saveJsonFile(name, companies)) showToast(tMode('toast.exported'));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedRaw = JSON.parse(event.target.result);
          const sanitizedData = parseTrackerImportPayload(importedRaw, {
            unnamedLabel: tMode('alert.unnamedCompany'),
          });
          if (sanitizedData) {
            setCompanies(filterItemsForMode(sanitizedData, mode));
            showToast(tMode('toast.imported'));
            if (user) batchSaveItems(user.uid, mode, sanitizedData).catch(console.error);
          } else {
            alert(tMode('alert.noCompanyData'));
          }
        } catch {
          alert(tMode('alert.importError'));
        }
      };
      reader.readAsText(file);
    }
    e.target.value = null;
  };

  const selectCompany = (company) => {
    const full = companies.find(c => c.id === company.id) || company;
    setSelectedId(full.id);
    setFormData({ ...initialFormState, ...full, rejection: full.rejection || { date: '', method: '', notes: '' } });
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
    showToast(tMode('toast.saved'));
    if (user && company) updateItem(user.uid, mode, { ...company, status: statusId }).catch(console.error);
  };

  const timelineBorder = isRTL ? 'border-r-2 pr-6' : 'border-l-2 pl-6';
  const timelineDot = isRTL ? '-right-[31px]' : '-left-[31px]';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const renderBoard = () => (
    <div className="flex-1 overflow-x-auto p-3 sm:p-6 bg-slate-50 min-h-0 flex flex-col sm:flex-row gap-4 sm:gap-6">
      {STATUSES.map(statusObj => {
        const statusCompanies = companies.filter(c => c.status === statusObj.id);
        if (statusCompanies.length === 0) return null;
        return (
          <div
            key={statusObj.id}
            className="board-column w-full sm:w-80 sm:flex-shrink-0 flex flex-col sm:h-full"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, statusObj.id)}
          >
            <div className={`rounded-t-xl px-4 py-3 font-bold border-b-4 shadow-sm ${statusObj.color}`}>
              {tStatus(statusObj.id)} ({statusCompanies.length})
            </div>
            <div className="bg-gray-100 rounded-b-xl p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {statusCompanies.map(company => {
                const journeySteps = getJourneySteps(company);
                const isRejected = rejectedStatuses.includes(company.status);
                return (
                  <div
                    key={company.id}
                    draggable
                    onDragStart={e => handleDragStart(e, company.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => { selectCompany(company); navigateTo('list', company.id); }}
                    style={company.cardColor ? { backgroundColor: company.cardColor } : undefined}
                    className={`${company.cardColor ? '' : 'bg-white'} p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}
                  >
                    <div className="font-bold text-gray-800 mb-1">{safeStr(company.name)}</div>
                    <div className="text-sm text-gray-600">{safeStr(company.role)}</div>
                    {company.location && (
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <MapPin size={12} /> {safeStr(company.location)}
                      </div>
                    )}
                    {(company.companySector || company.companySize || company.applicationSource) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {company.companySector && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">{safeStr(company.companySector)}</span>}
                        {company.companySize && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">👥 {safeStr(company.companySize)}</span>}
                        {company.applicationSource && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 font-medium">{t(`applicationSource.${company.applicationSource}`, company.applicationSource.replace(/_/g, ' '))}</span>}
                      </div>
                    )}
                    {journeySteps.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-0.5">
                        {journeySteps.map((step, i) => (
                          <React.Fragment key={i}>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isRejected ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                              {tInterviewType(step)}
                            </span>
                            {i < journeySteps.length - 1 && <span className="text-gray-300 text-[10px]">›</span>}
                          </React.Fragment>
                        ))}
                        {isRejected && (
                          <>
                            <span className="text-gray-300 text-[10px]">›</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-600">
                              {tStatus(company.status)}
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
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 p-3">
              <AppBrandMark size={56} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">{tMode('board.emptyTitle')}</h2>
            <p className="text-gray-500 mb-8 text-sm">{tMode('board.emptyDesc')}</p>

            {!user && (
              <button
                onClick={handleSignIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-3.5 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mb-3"
              >
                <Cloud size={20} /> {tMode('board.signInButton')}
              </button>
            )}

            <button
              onClick={openNewForm}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3.5 px-6 rounded-xl shadow transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mb-3"
            >
              <Plus size={20} /> {tMode('board.addFirstButton', 'Add your first entry')}
            </button>

            <button
              onClick={triggerFileInput}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"
            >
              <Upload size={16} /> {tMode('board.loadButton')}
            </button>

            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm py-2.5 px-6 rounded-xl border border-indigo-200 flex items-center justify-center gap-2 mb-4"
            >
              💡 {tMode('board.viewTutorial', 'View Tutorial')}
            </button>

            <div className="grid grid-cols-2 gap-3 text-left text-xs text-gray-500">
              <div className="bg-indigo-50 p-3 rounded-lg">
                <div className="font-bold text-indigo-700 mb-1 flex items-center gap-1"><Cloud size={12} /> {tMode('board.modeCloudTitle')}</div>
                <p>{tMode('board.modeCloudDesc')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-bold text-gray-700 mb-1 flex items-center gap-1"><Download size={12} /> {tMode('board.modeLocalTitle')}</div>
                <p>{tMode('board.modeLocalDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimeline = () => (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50 min-h-0 custom-scrollbar">
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
                <div
                  onClick={() => { selectCompany({ id: event.parentId }); navigateTo('list', event.parentId); }}
                  className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                >
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
                  <h3 className="font-bold text-lg mb-1">{event.eventType === 'interview' ? (event.type ? tInterviewType(event.type) : '') : safeStr(event.task)}</h3>
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
      { label: tMode('stats.total', 'Total Applications'), value: stats.total, color: 'text-blue-600' },
      { label: tMode('stats.active', 'Active'), value: stats.active, color: 'text-indigo-600' },
      { label: tMode('stats.responseRate', 'Response Rate'), value: `${stats.responseRate}%`, color: 'text-green-600' },
      { label: tMode('stats.interviews', 'Interviews'), value: stats.interviewCount, color: 'text-purple-600' },
    ];
    const maxCount = Math.max(...STATUSES.map(s => stats.byStatus[s.id] || 0), 1);

    const funnelOrder = getFunnelOrder(mode);
    const JOURNEY_STAGES = funnelOrder.map(id => {
      const statusDef = STATUSES.find(s => s.id === id);
      return {
        id,
        label: tStatus(id),
        color: statusDef ? statusDef.color.replace('border-', 'border-').replace('200', '300') : 'bg-gray-100 text-gray-800 border-gray-300',
      };
    });
    const FUNNEL_ORDER = funnelOrder;
    const INTERVIEW_TYPE_TO_STAGE = isRecruiter ? {
      'Intro Call / HR': 'screening',
      'Initial Manager Interview': 'screening',
      'Technical Interview': 'technical',
      'Home Assignment / Task': 'technical',
      'Manager Interview': 'final_interview',
      'VP / CEO Interview': 'final_interview',
      'HR Interview': 'final_interview',
      'Salary Offer': 'offer_extended',
      'References Check': 'offer_extended',
    } : {
      'Intro Call / HR': 'hr_call',
      'Initial Manager Interview': 'initial_manager_interview',
      'Technical Interview': 'tech_interview',
      'Manager Interview': 'manager_interview',
      'Home Assignment / Task': 'home_assignment',
      'VP / CEO Interview': 'vp_ceo_interview',
      'HR Interview': 'hr_interview',
      'Salary Offer': 'offer',
      'References Check': 'references',
    };
    const funnelIdx = (id) => FUNNEL_ORDER.indexOf(id);
    const companiesReachedStage = (stageId) => {
      const idx = funnelIdx(stageId);
      // Every tracked company has at least applied, regardless of its current status
      // (e.g. rejected/ghosted/withdrawn/frozen aren't part of the linear funnel order).
      if (idx === 0) return companies.length;
      return companies.filter(c => {
        const statusIdx = funnelIdx(c.status);
        if (statusIdx !== -1 && statusIdx >= idx) return true;
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
    const funnelGroupCounts = getFunnelGroups(mode).map(group =>
      group.map(id => {
        const stage = journeyCounts.find(s => s.id === id);
        return stage || { id, label: tStatus(id), color: 'bg-gray-100 text-gray-800 border-gray-300', count: companiesReachedStage(id) };
      })
    );

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
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50 min-h-0 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 className="text-indigo-600" /> {tMode('stats.title', 'Statistics')}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 text-center">
                {card.label === tMode('stats.responseRate', 'Response Rate') ? (
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-6">
            <div className="flex items-center justify-between mb-1 gap-2">
              <h3 className="font-bold text-gray-800">🔽 {tMode('stats.journey', 'Hiring Funnel')}</h3>
              {avgDays !== null && (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">
                  <span className="hidden sm:inline">{tMode('stats.avgDays', 'Avg. days from first to last interview')}: </span>
                  <span className="sm:hidden">{tMode('stats.avgDaysShort', 'Avg')}: </span>
                  <span className="font-bold text-gray-700">{avgDays}d</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-5">{tMode('stats.journeySubtitle', 'How many applications reached each stage')}</p>
            {!hasJourneyData ? (
              <div className="text-center text-gray-400 py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">
                {tMode('stats.noData', 'Add more to see patterns')}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex items-center gap-1 min-w-max">
                {funnelGroupCounts.map((group, i) => {
                  const prevEntryCount = i > 0 ? funnelGroupCounts[i - 1][0].count : null;
                  const entryCount = group[0].count;
                  const pct = prevEntryCount && prevEntryCount > 0
                    ? Math.round((entryCount / prevEntryCount) * 100)
                    : null;
                  return (
                    <React.Fragment key={group.map(s => s.id).join('-')}>
                      {i > 0 && (
                        <div className="flex flex-col items-center mx-1">
                          <span className="text-gray-400 text-lg leading-none">›</span>
                          {pct !== null && (
                            <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
                          )}
                        </div>
                      )}
                      <div className={`flex items-center gap-1 ${group.length > 1 ? 'p-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50' : ''}`}>
                        {group.map(stage => (
                          <div key={stage.id} className={`flex flex-col items-center px-3 py-2 rounded-lg border font-medium text-sm ${stage.color}`}>
                            <span className="font-bold">{stage.label}</span>
                            <span className="text-lg font-black leading-tight">{stage.count}</span>
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-5">{tMode('stats.byStatus', 'By Status')}</h3>
            <div className="space-y-3">
              {STATUSES.filter(s => (stats.byStatus[s.id] || 0) > 0).map(s => (
                <div key={s.id} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-20 sm:w-32 text-sm text-gray-600 flex-shrink-0 truncate">{tStatus(s.id)}</div>
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
                {tMode('stats.upcoming', 'Upcoming — Next 14 Days')}
              </h3>
              <div className="space-y-3">
                {upcomingEvents.map((event, i) => {
                  const days = getDaysUntil(event.date);
                  return (
                    <div key={`${event.companyName}-${event.date}`} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className={`text-center px-3 py-1 rounded-lg font-bold text-sm flex-shrink-0 min-w-[48px] ${days === 0 ? 'bg-red-500 text-white' : days <= 2 ? 'bg-orange-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {days === 0 ? tMode('stats.today', 'Today') : `+${days}d`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 truncate">{safeStr(event.companyName)}</div>
                        <div className="text-sm text-gray-600 truncate">{event.eventType === 'interview' ? (event.type ? tInterviewType(event.type) : '') : safeStr(event.task)}</div>
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
    <div className="flex flex-col h-dvh bg-gray-50 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold">
          {toastMessage}
        </div>
      )}

      <header className={`bg-gradient-to-r ${
        isRecruiter
          ? (isRTL ? 'from-yellow-600 to-amber-500' : 'from-amber-500 to-yellow-600')
          : (isRTL ? 'from-indigo-800 to-blue-700' : 'from-blue-700 to-indigo-800')
      } text-white shadow-md flex-shrink-0`}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm shrink-0">
              <AppBrandMark size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold tracking-tight leading-tight">
                {tMode('header.title')}
                {companies.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${isSaved ? 'bg-green-500/20 text-green-100' : 'bg-yellow-500/50 text-yellow-50'}`}>
                    {isSaved ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {isSaved ? tMode('header.savedInBrowser') : tMode('header.saving')}
                  </span>
                )}
              </h1>
              <p className={`${isRecruiter ? 'text-yellow-100' : 'text-blue-200'} text-xs sm:text-sm truncate hidden sm:block`}>{tMode('header.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button onClick={openNewForm} className={`flex items-center gap-1.5 bg-white ${isRecruiter ? 'text-yellow-600 hover:bg-yellow-50 active:bg-yellow-100' : 'text-indigo-700 hover:bg-blue-50 active:bg-blue-100'} px-2 sm:px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-xs sm:text-sm min-h-[40px]`}>
              <Plus size={16} className="shrink-0" />
              <span className="shrink-0">{tMode('header.addCompany')}</span>
            </button>

            {user ? (
              <>
                <button
                  onClick={handleSignOut}
                  title={t('header.driveOnTooltip')}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-bold transition-colors border min-h-[40px] ${syncing ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-100' : 'bg-green-500/20 border-green-400/30 text-green-100 hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-100'}`}
                >
                  <Cloud size={16} className={syncing ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline shrink-0 max-w-[5rem] truncate sm:max-w-none">{syncing ? t('header.driveSyncing') : user.displayName?.split(' ')[0] || t('header.driveOn')}</span>
                </button>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  title={t('header.syncNow')}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-blue-100 transition-colors min-h-[40px] disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  <span className="shrink-0">{t('header.syncNow')}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                title={t('header.connectDriveTooltip')}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-blue-100 transition-colors min-h-[40px]"
              >
                <CloudOff size={16} className="shrink-0" /> <span className="hidden sm:inline shrink-0 max-w-[5rem] truncate sm:max-w-none">{t('header.connectDrive')}</span>
              </button>
            )}

            {onModeChange && (
              <div className="hidden md:block">
                <ModeDropdown currentMode={mode} onModeChange={onModeChange} isRTL={isRTL} />
              </div>
            )}

            {canInstall && (
              <button
                type="button"
                onClick={() => runInstall(t)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-bold bg-white text-indigo-700 shadow-sm min-h-[40px] transition-colors hover:bg-blue-50 active:bg-blue-100 shrink-0"
                title={t('header.installApp')}
              >
                <Smartphone size={16} className="shrink-0" />
                <span className="shrink-0 max-w-[5rem] truncate sm:max-w-none">{t('header.installApp')}</span>
              </button>
            )}

            {/* Desktop controls */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20">
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

            <div className="hidden md:flex bg-white/10 rounded-lg p-1">
              <button onClick={handleExport} title={t('header.downloadTooltip')} className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded text-white transition-colors border border-green-400/30">
                <Download size={18} />
              </button>
              <label className="p-2 hover:bg-white/20 rounded text-white transition-colors cursor-pointer" title={t('header.uploadTooltip')}>
                <Upload size={18} />
                <input id="main-file-upload" type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                type="button"
                data-testid="open-templates"
                aria-label={t('templates.title', 'Interview Templates')}
                onClick={() => setShowTemplates(true)}
                title={t('templates.title', 'Interview Templates')}
                className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              >
                📚
              </button>
              <button
                onClick={() => setShowAIFinder(true)}
                title={isRecruiter ? t('ai.findCandidates', 'Find Candidates') : t('ai.findJobs', 'Find Jobs')}
                className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              >
                {isRecruiter ? '👥' : '🔍'}
              </button>
              <button
                onClick={() => setShowAISettings(true)}
                title={t('header.aiSettings', 'AI Settings')}
                className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => setShowOnboarding(true)}
                title={tMode('board.viewTutorial', 'View Tutorial')}
                className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              >
                💡
              </button>
            </div>

            {/* Mobile overflow menu */}
            <div className="md:hidden relative">
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <MoreVertical size={20} />
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-[200px] py-2`}>
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Languages size={14} className="text-gray-400" />
                        <select
                          value={i18n.language}
                          onChange={e => { i18n.changeLanguage(e.target.value); localStorage.setItem('appLanguage', e.target.value); setMobileMenuOpen(false); }}
                          className="text-gray-700 text-sm font-bold border-none outline-none cursor-pointer bg-transparent flex-1"
                        >
                          <option value="en">English</option>
                          <option value="he">עברית</option>
                          <option value="fr">Français</option>
                        </select>
                      </div>
                    </div>
                    {user && (
                      <button onClick={() => { handleSyncNow(); setMobileMenuOpen(false); }} disabled={syncing} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50">
                        <RefreshCw size={16} className={`text-blue-500 ${syncing ? 'animate-spin' : ''}`} /> {t('header.syncNow')}
                      </button>
                    )}
                    <button onClick={() => { handleExport(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <Download size={16} className="text-green-600" /> {t('header.downloadTooltip')}
                    </button>
                    <label className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 cursor-pointer">
                      <Upload size={16} className="text-blue-600" /> {t('header.uploadTooltip')}
                      <input type="file" accept=".json" onChange={e => { handleImport(e); setMobileMenuOpen(false); }} className="hidden" />
                    </label>
                    <button type="button" data-testid="open-templates" onClick={() => { setShowTemplates(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <span>📚</span> {t('templates.title', 'Interview Templates')}
                    </button>
                    <button onClick={() => { setShowAIFinder(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <span>{isRecruiter ? '👥' : '🔍'}</span> {isRecruiter ? t('ai.findCandidates', 'Find Candidates') : t('ai.findJobs', 'Find Jobs')}
                    </button>
                    <button onClick={() => { setShowAISettings(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <Settings size={16} className="text-gray-500" /> {t('header.aiSettings', 'AI Settings')}
                    </button>
                    <button onClick={() => { setShowOnboarding(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      <span>💡</span> {tMode('board.viewTutorial', 'View Tutorial')}
                    </button>
                    {canInstall && (
                      <button
                        type="button"
                        onClick={() => { runInstall(t); setMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 border-t border-gray-100"
                      >
                        <Smartphone size={16} className="text-indigo-600" /> {t('header.installApp')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          </div>

          {onModeChange && (
            <div className="md:hidden">
              <ModeDropdown currentMode={mode} onModeChange={onModeChange} isRTL={isRTL} />
            </div>
          )}
        </div>

        <div className="flex px-2 sm:px-6 gap-0.5 sm:gap-1 mt-2 overflow-x-auto scrollbar-none">
          {[
            { key: 'board', icon: <Layout size={14} /> },
            { key: 'list', icon: <List size={14} /> },
            { key: 'timeline', icon: <Calendar size={14} /> },
            { key: 'calendar', icon: <Calendar size={14} /> },
            { key: 'stats', icon: <BarChart2 size={14} /> },
          ].map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => navigateTo(key)}
              className={`px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-t-lg font-medium flex items-center gap-0.5 sm:gap-2 transition-colors whitespace-nowrap flex-shrink-0 text-[10px] sm:text-sm min-h-[34px] sm:min-h-[44px] touch-manipulation ${activeTab === key ? 'bg-gray-50 text-indigo-800' : 'bg-white/10 text-blue-100 hover:bg-white/20 active:bg-white/25'}`}
            >
              <span className="hidden sm:inline-flex shrink-0">{icon}</span>
              <span className="shrink-0">{t(`tabs.${key}`, key)}</span>
            </button>
          ))}
        </div>
      </header>


      {activeTab === 'board' && renderBoard()}
      {activeTab === 'timeline' && renderTimeline()}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'calendar' && (
        <div className="flex-1 overflow-auto calendar-page min-h-0">
          <CalendarView
            events={calendarEvents}
            legendTypes={['interview', 'assignment']}
            isRTL={isRTL}
            onEventClick={ev => { selectCompany({ id: ev.parentId }); navigateTo('list', ev.parentId); }}
          />
        </div>
      )}

      {activeTab === 'list' && (
        <div className="flex flex-1 overflow-hidden">
          <div className={`w-full md:w-1/3 lg:w-1/4 flex-shrink-0 bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 flex-col ${selectedId || isEditing ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <SearchFilter
                onSearch={setSearchText}
                onFilterChange={setFilterStatuses}
                placeholder={tMode('list.searchPlaceholder')}
                filterOptions={STATUSES.map(s => ({ id: s.id, label: tStatus(s.id) }))}
                mode={mode}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredCompanies.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">{tMode('list.noResults')}</div>
              ) : (
                <>
                  {filteredCompanies.slice(0, visibleCount).map(company => {
                    const statusInfo = STATUSES.find(s => s.id === company.status);
                    const priorityInfo = PRIORITIES.find(p => p.id === company.priority);
                    const isSelected = selectedId === company.id;
                    const isChecked = selectedItems.has(String(company.id));
                    return (
                      <div
                        key={company.id}
                        onClick={() => selectCompany(company)}
                        className={`p-3 sm:p-4 min-h-[56px] rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm border ring-1 ring-indigo-500' : 'hover:bg-gray-50 active:bg-gray-100 border border-transparent'} ${isChecked ? 'ring-1 ring-purple-400' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleItemSelected(company.id)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                            aria-label={tMode('list.selectItem', 'Select item')}
                          />
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(company.name)}`}>
                            {getInitials(company.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-gray-900 truncate">{safeStr(company.name)}</h3>
                              {priorityInfo && <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityInfo.color}`}></div>}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{safeStr(company.role)}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusInfo?.color || 'bg-gray-100 border-gray-200'}`}>
                                {statusInfo ? tStatus(statusInfo.id) : tStatus('unknown')}
                              </span>
                              {company.companySector && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-medium">{safeStr(company.companySector)}</span>
                              )}
                              {company.companySize && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500 font-medium">👥 {safeStr(company.companySize)}</span>
                              )}
                              {company.applicationSource && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-medium">{t(`applicationSource.${company.applicationSource}`, company.applicationSource.replace(/_/g, ' '))}</span>
                              )}
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
                      {tMode('list.loadMore', 'Load more')} ({filteredCompanies.length - visibleCount} {tMode('list.remaining', 'remaining')})
                    </button>
                  )}
                </>
              )}
            </div>

            <BulkActionsBar
              t={t}
              selectedCount={selectedItems.size}
              onBulkDelete={handleBulkDelete}
              onBulkStatusUpdate={handleBulkStatusUpdate}
              onBulkExport={handleBulkExport}
              onClearSelection={clearSelection}
              statusOptions={STATUSES.map(s => ({ id: s.id, label: tStatus(s.id) }))}
            />
          </div>

          <div className={`flex-1 flex-col bg-slate-50 overflow-y-auto relative custom-scrollbar ${!selectedId && !isEditing ? 'hidden md:flex' : 'flex'}`}>
            {(selectedId || isEditing) && (
              <div className="md:hidden sticky top-0 bg-white/90 backdrop-blur-sm p-3 border-b border-gray-200 z-10">
                <button onClick={() => { setSelectedId(null); setIsEditing(false); }} className="flex items-center gap-2 text-indigo-600 font-bold">
                  <BackArrow size={18} /> {tMode('list.backToList')}
                </button>
              </div>
            )}

            {isEditing ? (
              <div className="p-6 max-w-4xl mx-auto w-full pb-20">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {formData.id ? tMode('form.editTitle') : tMode('form.addTitle')}
                    </h2>
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditing(false); if (!formData.id) setSelectedId(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">{tMode('form.cancel')}</button>
                      <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition">{tMode('form.save')}</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.companyName')}</label>
                      <input type="text" value={safeStr(formData.name)} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.role')}</label>
                      <input type="text" value={safeStr(formData.role)} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.processStatus')}</label>
                      <select value={formData.status || 'applied'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{tStatus(s.id)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.priority')}</label>
                      <Tooltip text={t('tooltips.priority')} position="top">
                        <select value={formData.priority || 'medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{t(`priority.${p.id}`)}</option>)}
                        </select>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-sm font-bold text-gray-700 mb-2">{tMode('form.cardColor', 'Card Color')}</label>
                    <CardColorPicker
                      value={formData.cardColor || ''}
                      onChange={(color) => setFormData({ ...formData, cardColor: color })}
                      noneLabel={tMode('form.cardColorNone', 'None')}
                    />
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-8">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Globe size={18} /> {tMode('form.linksSection')}</h3>
                    {isRecruiter ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder={tMode('form.linkedinCandidatePlaceholder')} value={safeStr(formData.linkedinCandidate)} onChange={e => setFormData({...formData, linkedinCandidate: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                        <input type="text" placeholder={tMode('form.locationPlaceholder')} value={safeStr(formData.location)} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                        <input type="text" placeholder={tMode('form.currentRolePlaceholder')} value={safeStr(formData.currentRole)} onChange={e => setFormData({...formData, currentRole: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                        <input type="text" placeholder={tMode('form.expectedSalaryPlaceholder')} value={safeStr(formData.expectedSalary)} onChange={e => setFormData({...formData, expectedSalary: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                        <input type="text" placeholder={tMode('form.sourcePlaceholder')} value={safeStr(formData.source)} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md md:col-span-2" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <input type="text" placeholder={tMode('form.websitePlaceholder')} value={safeStr(formData.website)} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                          <input type="text" placeholder={tMode('form.linkedinPlaceholder')} value={safeStr(formData.linkedinCompany)} onChange={e => setFormData({...formData, linkedinCompany: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                          <input type="text" placeholder={tMode('form.locationPlaceholder')} value={safeStr(formData.location)} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                        </div>
                        <textarea placeholder={tMode('form.descriptionPlaceholder')} value={safeStr(formData.description)} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md h-20 resize-none"></textarea>
                      </>
                    )}
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-8">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🏢 {t('form.companyDetailsSection', 'Company Details')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{t('form.companySize', 'Company Size')}</label>
                        <select value={formData.companySize || ''} onChange={e => setFormData({...formData, companySize: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white">
                          <option value="">—</option>
                          <option value="1-10">1–10</option>
                          <option value="11-50">11–50</option>
                          <option value="51-200">51–200</option>
                          <option value="201-500">201–500</option>
                          <option value="501-1000">501–1,000</option>
                          <option value="1001-5000">1,001–5,000</option>
                          <option value="5001+">5,001+</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{t('form.companySector', 'Sector')}</label>
                        <input type="text" placeholder={t('form.companySectorPlaceholder', 'e.g. FinTech, HealthTech…')} value={safeStr(formData.companySector)} onChange={e => setFormData({...formData, companySector: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{t('form.applicationSource', 'How did I start?')}</label>
                        <select value={formData.applicationSource || ''} onChange={e => setFormData({...formData, applicationSource: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white">
                          <option value="">—</option>
                          <option value="me_linkedin">{t('applicationSource.me_linkedin', 'Me → LinkedIn')}</option>
                          <option value="me_job_search">{t('applicationSource.me_job_search', 'Me → Job Board')}</option>
                          <option value="me_friend">{t('applicationSource.me_friend', 'Me → Friend Tip')}</option>
                          <option value="me_article">{t('applicationSource.me_article', 'Me → Article')}</option>
                          <option value="friend_suggest">{t('applicationSource.friend_suggest', 'Friend Referred Me')}</option>
                          <option value="headhunter">{t('applicationSource.headhunter', 'Headhunter')}</option>
                          <option value="recruiting_company">{t('applicationSource.recruiting_company', 'Recruiting Agency')}</option>
                          <option value="company_itself">{t('applicationSource.company_itself', 'Company Reached Out')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><User size={18} /> {tMode('form.interviews')}</h3>
                      <button
                        onClick={() => setFormData({...formData, interviews: [...(formData.interviews || []), { type: 'Intro Call / HR', date: '', interviewer: '', summary: '' }]})}
                        className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
                      >
                        <Plus size={16} /> {tMode('form.addInterview')}
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
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 ${isRTL ? 'pl-6' : 'pr-6'}`}>
                          <select
                            value={safeStr(interview.type)}
                            onChange={e => { const a = [...formData.interviews]; a[index].type = e.target.value; setFormData({...formData, interviews: a}); }}
                            className="w-full p-2 text-sm border rounded bg-white"
                          >
                            <option value="" disabled>{tMode('form.selectInterviewType')}</option>
                            {INTERVIEW_TYPE_KEYS.map(key => <option key={key} value={key}>{tInterviewType(key)}</option>)}
                            {interview.type && !INTERVIEW_TYPE_KEYS.includes(interview.type) && <option value={safeStr(interview.type)}>{safeStr(interview.type)}</option>}
                          </select>
                          <input type="date" dir="ltr" value={safeStr(interview.date)} onChange={e => { const a = [...formData.interviews]; a[index].date = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded" />
                          <input type="text" placeholder={tMode('form.interviewerPlaceholder')} value={safeStr(interview.interviewer)} onChange={e => { const a = [...formData.interviews]; a[index].interviewer = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded" />
                        </div>
                        <textarea placeholder={tMode('form.summaryPlaceholder')} value={safeStr(interview.summary)} onChange={e => { const a = [...formData.interviews]; a[index].summary = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded h-16"></textarea>
                      </div>
                    ))}
                  </div>

                  {rejectedStatuses.includes(formData.status) && (
                    <div className="mb-8 bg-red-50 p-5 rounded-xl border border-red-100">
                      <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} /> {tMode('form.rejectionTitle', 'Rejection Details')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.rejectionDate', 'Rejection Date')}</label>
                          <input
                            type="date"
                            dir="ltr"
                            value={safeStr(formData.rejection?.date)}
                            onChange={e => setFormData({...formData, rejection: {...(formData.rejection || {}), date: e.target.value}})}
                            className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.rejectionMethod', 'How Were You Notified')}</label>
                          <select
                            value={safeStr(formData.rejection?.method)}
                            onChange={e => setFormData({...formData, rejection: {...(formData.rejection || {}), method: e.target.value}})}
                            className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 bg-white"
                          >
                            <option value="">{tMode('form.rejectionMethodSelect', 'Select...')}</option>
                            {REJECTION_METHOD_KEYS.map(key => <option key={key} value={key}>{t(`rejectionMethod.${key}`, key)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">{tMode('form.rejectionNotes', 'Notes / Feedback')}</label>
                        <textarea
                          value={safeStr(formData.rejection?.notes)}
                          onChange={e => setFormData({...formData, rejection: {...(formData.rejection || {}), notes: e.target.value}})}
                          className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 h-20 resize-none"
                          placeholder={tMode('form.rejectionNotesPlaceholder', 'What was the feedback?')}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">{tMode('form.notes')}</h3>
                    <textarea value={safeStr(formData.generalNotes)} onChange={e => setFormData({...formData, generalNotes: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-indigo-500" placeholder={tMode('form.notesPlaceholder')}></textarea>
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
                  const isRejected = rejectedStatuses.includes(company.status);
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
                                  {statusInfo ? tStatus(statusInfo.id) : tStatus('unknown')}
                                </span>
                                {priorityInfo && (
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${priorityInfo.color}`}>
                                    {t(`priority.${priorityInfo.id}`)} {tMode('detail.priorityLabel')}
                                  </span>
                                )}
                                {company.location && (
                                  <span className="px-3 py-1 rounded-full text-sm bg-white border border-gray-200 text-gray-600 flex items-center gap-1">
                                    <MapPin size={14} /> {safeStr(company.location)}
                                  </span>
                                )}
                                {company.companySize && (
                                  <span className="px-3 py-1 rounded-full text-sm bg-white border border-gray-200 text-gray-600">
                                    👥 {safeStr(company.companySize)}
                                  </span>
                                )}
                                {company.companySector && (
                                  <span className="px-3 py-1 rounded-full text-sm bg-white border border-gray-200 text-gray-600">
                                    🏢 {safeStr(company.companySector)}
                                  </span>
                                )}
                                {company.applicationSource && (
                                  <span className="px-3 py-1 rounded-full text-sm bg-white border border-gray-200 text-gray-600">
                                    {t(`applicationSource.${company.applicationSource}`, company.applicationSource.replace(/_/g, ' '))}
                                  </span>
                                )}
                              </div>
                              {journeySteps.length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-1">
                                  {journeySteps.map((step, i) => (
                                    <React.Fragment key={i}>
                                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${isRejected ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {tInterviewType(step)}
                                      </span>
                                      {i < journeySteps.length - 1 && <span className="text-gray-400 text-xs">›</span>}
                                    </React.Fragment>
                                  ))}
                                  {isRejected && (
                                    <>
                                      <span className="text-gray-400 text-xs">›</span>
                                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-200 text-red-700">
                                        {tStatus(company.status)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium">
                              <Edit2 size={16} /> {tMode('detail.editDetails')}
                            </button>
                            <button onClick={() => handleDelete(company.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition" title={tMode('detail.deleteCompany')}>
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-4">
                          {!isRecruiter && safeUrl(company.website) && (
                            <a href={safeUrl(company.website)} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Globe size={14} /> {tMode('detail.companyWebsite')}
                            </a>
                          )}
                          {!isRecruiter && safeUrl(company.linkedinCompany) && (
                            <a href={safeUrl(company.linkedinCompany)} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Linkedin size={14} /> {tMode('detail.companyLinkedin')}
                            </a>
                          )}
                          {isRecruiter && safeUrl(company.linkedinCandidate) && (
                            <a href={safeUrl(company.linkedinCandidate)} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Linkedin size={14} /> {tMode('detail.candidateLinkedin')}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                          {!isRecruiter && (company.description || company.products) && (
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                              <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">{tMode('detail.aboutTitle')}</h3>
                              {company.description && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{tMode('detail.whatTheyDo')}</h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">{safeStr(company.description)}</p>
                                </div>
                              )}
                              {company.products && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{tMode('detail.products')}</h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">{safeStr(company.products)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {isRecruiter && (company.currentRole || company.expectedSalary || company.source) && (
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                              <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">{tMode('detail.candidateInfo')}</h3>
                              {company.currentRole && (
                                <div className="mb-3">
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{tMode('form.currentRolePlaceholder')}</h4>
                                  <p className="text-gray-700 text-sm">{safeStr(company.currentRole)}</p>
                                </div>
                              )}
                              {company.expectedSalary && (
                                <div className="mb-3">
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{tMode('form.expectedSalaryPlaceholder')}</h4>
                                  <p className="text-gray-700 text-sm">{safeStr(company.expectedSalary)}</p>
                                </div>
                              )}
                              {company.source && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">{tMode('form.sourcePlaceholder')}</h4>
                                  <p className="text-gray-700 text-sm">{safeStr(company.source)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {isRejected && company.rejection && (company.rejection.date || company.rejection.method || company.rejection.notes) && (
                            <div className="bg-red-50 p-5 rounded-xl shadow-sm border border-red-100">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-red-800 flex items-center gap-2">
                                  <AlertTriangle size={18} /> {tMode('detail.rejectionTitle', 'Rejection Details')}
                                </h3>
                                {!isRecruiter && (
                                <button
                                  onClick={() => setRejectionCompany(company)}
                                  className="text-xs px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors flex items-center gap-1"
                                >
                                  ✨ {tMode('detail.analyzeRejection', 'Analyze with AI')}
                                </button>
                                )}
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
                                <CheckCircle size={18} /> {tMode('detail.personalNotes')}
                              </h3>
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">{safeStr(company.generalNotes)}</p>
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-6 text-xl border-b pb-3 flex items-center gap-2">
                              <User size={20} className="text-indigo-600" /> {tMode('detail.processHistory')}
                            </h3>
                            {company.interviews && Array.isArray(company.interviews) && company.interviews.length > 0 ? (
                              <div className={`relative ${timelineBorder} border-indigo-100 space-y-6`}>
                                {company.interviews.map((interview, idx) => (
                                  <div key={idx} className="relative">
                                    <div className={`absolute ${timelineDot} top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white`}></div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-gray-100 relative">
                                      <button
                                        onClick={() => handleDeleteInterview(company.id, idx)}
                                        className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-gray-400 hover:text-red-500`}
                                        aria-label={tMode('detail.deleteInterview')}
                                        title={tMode('detail.deleteInterview')}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                      <div className={`flex justify-between items-start mb-2 ${isRTL ? 'pl-8' : 'pr-8'}`}>
                                        <h4 className="font-bold text-gray-900">
                                          {interview.type ? tInterviewType(interview.type) : tMode('detail.processStage')}
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
                                {tMode('detail.noInterviews')}
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
                <p className="text-xl font-bold mb-2 text-gray-500">{tMode('detail.selectCompany')}</p>
                <p className="text-sm mt-2">{tMode('detail.selectCompanyHint')}</p>
              </div>
            )}
          </div>
        </div>
      )}




      {showOnboarding && (
        <Onboarding
          t={t}
          i18n={i18n}
          isRTL={isRTL}
          onClose={() => setShowOnboarding(false)}
          openNewForm={() => { setShowOnboarding(false); openNewForm(); }}
          triggerFileInput={() => { setShowOnboarding(false); triggerFileInput(); }}
          openAISettings={() => { setShowOnboarding(false); setShowAISettings(true); }}
          isRecruiter={isRecruiter}
        />
      )}

      {showAISettings && (
        <APIKeySettings
          t={t}
          onClose={() => setShowAISettings(false)}
          currentMode={mode}
          onModeChange={onModeChange}
        />
      )}

      {showTemplates && (
        <TemplateLibrary
          t={t}
          onClose={() => setShowTemplates(false)}
          onStartSimulation={handleStartSimulation}
          isRecruiter={isRecruiter}
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

      {!isRecruiter && (
      <AIAssistant
        company={selectedId ? formData : null}
        companies={companies}
        language={i18n.language}
        t={t}
        onOpenSettings={() => setShowAISettings(true)}
        onSaveToCompany={selectedId ? handleSaveToCompany : null}
      />
      )}

      {simulationData && (
        <ChatModal
          key={`sim-${simulationData.title}`}
          t={t}
          language={i18n.language}
          sessionKey={simulationData.title}
          systemPromptOverride={simulationData.systemPrompt}
          simulationTitle={simulationData.title}
          autoStart={true}
          onClose={() => setSimulationData(null)}
          onOpenSettings={() => setShowAISettings(true)}
        />
      )}

      {showAIFinder && (
        <ChatModal
          key={isRecruiter ? 'candidate-finder' : 'job-finder'}
          t={t}
          language={i18n.language}
          sessionKey={isRecruiter ? 'candidate-finder' : 'job-finder'}
          systemPromptOverride={
            isRecruiter
              ? getCandidateFinderSystemPrompt(companies, i18n.language)
              : getJobFinderSystemPrompt(companies, i18n.language)
          }
          simulationTitle={isRecruiter ? t('ai.findCandidates', 'Find Candidates') : t('ai.findJobs', 'Find Jobs')}
          autoStart={true}
          onClose={() => setShowAIFinder(false)}
          onOpenSettings={() => { setShowAIFinder(false); setShowAISettings(true); }}
        />
      )}
    </div>
  );
}
