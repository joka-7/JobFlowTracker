import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, MapPin, Globe, Calendar,
  User, CheckCircle, Clock, Trash2, Edit2,
  ArrowLeft, ArrowRight, Download, Upload, Filter, Layout, List, Activity, AlertTriangle,
  Cloud, CloudOff, Languages
} from 'lucide-react';
import { initDriveSync, signIn, signOut, readFromDrive, writeToDrive, DRIVE_CLIENT_ID } from './driveSync';

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

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'he' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('appLanguage', next);
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
  const [activeTab, setActiveTab] = useState('board');
  const [toastMessage, setToastMessage] = useState('');

  const [driveReady, setDriveReady] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const driveWriteTimer = useRef(null);

  const initialFormState = {
    name: '', role: '', location: '', status: 'applied', priority: 'medium',
    website: '', linkedinCompany: '', linkedinHR: '', description: '', products: '',
    interviews: [], homeworks: [], contacts: [], generalNotes: ''
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
    if (DRIVE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') return;
    initDriveSync().then(() => setDriveReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!driveConnected || companies.length === 0) return;
    if (driveWriteTimer.current) clearTimeout(driveWriteTimer.current);
    driveWriteTimer.current = setTimeout(async () => {
      setDriveSyncing(true);
      try { await writeToDrive(companies); } catch (e) { console.error('Drive write failed:', e); }
      setDriveSyncing(false);
    }, 3000);
    return () => clearTimeout(driveWriteTimer.current);
  }, [companies, driveConnected]);

  const handleConnectDrive = async () => {
    try {
      setDriveSyncing(true);
      await signIn();
      const driveData = await readFromDrive();
      if (driveData && Array.isArray(driveData) && driveData.length > 0) {
        setCompanies(driveData);
        showToast(t('toast.driveConnectedWithData'));
      } else {
        showToast(t('toast.driveConnectedEmpty'));
      }
      setDriveConnected(true);
    } catch {
      showToast(t('toast.driveFailed'));
    } finally {
      setDriveSyncing(false);
    }
  };

  const handleDisconnectDrive = () => {
    signOut();
    setDriveConnected(false);
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSave = () => {
    if (!formData.name) { alert(t('form.requiredName')); return; }
    if (formData.id) {
      setCompanies(companies.map(c => String(c.id) === String(formData.id) ? formData : c));
    } else {
      const newCompany = { ...formData, id: Date.now().toString() };
      setCompanies([newCompany, ...companies]);
      setSelectedId(newCompany.id);
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
    }
  };

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
              id: c.id ? String(c.id) : Date.now().toString() + idx,
            }));
            setCompanies(sanitizedData);
            showToast(t('toast.imported'));
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

  const openNewForm = () => {
    setFormData(initialFormState);
    setSelectedId(null);
    setIsEditing(true);
    setActiveTab('list');
  };

  const selectCompany = (company) => {
    setSelectedId(company.id);
    setFormData(company);
    setIsEditing(false);
  };

  const triggerFileInput = () => document.getElementById('main-file-upload').click();

  // RTL-aware helpers
  const timelineBorder = isRTL ? 'border-r-2 pr-6' : 'border-l-2 pl-6';
  const timelineDot = isRTL ? '-right-[31px]' : '-left-[31px]';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const renderBoard = () => (
    <div className="flex-1 overflow-x-auto p-6 bg-slate-50 min-h-0 flex gap-6">
      {STATUSES.map(statusObj => {
        const statusCompanies = companies.filter(c => c.status === statusObj.id);
        if (statusCompanies.length === 0) return null;
        return (
          <div key={statusObj.id} className="w-80 flex-shrink-0 flex flex-col h-full">
            <div className={`rounded-t-xl px-4 py-3 font-bold border-b-4 shadow-sm ${statusObj.color}`}>
              {t(`status.${statusObj.id}`)} ({statusCompanies.length})
            </div>
            <div className="bg-gray-100 rounded-b-xl p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {statusCompanies.map(company => (
                <div
                  key={company.id}
                  onClick={() => { selectCompany(company); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="font-bold text-gray-800 mb-1">{safeStr(company.name)}</div>
                  <div className="text-sm text-gray-600">{safeStr(company.role)}</div>
                  {company.location && (
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <MapPin size={12} /> {safeStr(company.location)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {companies.length === 0 && (
        <div className="w-full flex flex-col items-center justify-center p-8">
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200 text-center max-w-lg w-full">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Download size={40} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-4">{t('board.emptyTitle')}</h2>
            <p className="text-gray-600 mb-8">{t('board.emptyDesc')}</p>
            <button
              onClick={triggerFileInput}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <Upload size={24} /> {t('board.loadButton')}
            </button>
            <div className={`mt-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg flex items-start gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
              <p><strong>{t('board.noteLabel')}</strong> {t('board.noteText')}</p>
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
            <button onClick={openNewForm} className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
              <Plus size={18} /> {t('header.addCompany')}
            </button>

            {driveReady && (
              driveConnected ? (
                <button
                  onClick={handleDisconnectDrive}
                  title={t('header.driveOnTooltip')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${driveSyncing ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-100' : 'bg-green-500/20 border-green-400/30 text-green-100 hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-100'}`}
                >
                  <Cloud size={16} className={driveSyncing ? 'animate-pulse' : ''} />
                  {driveSyncing ? t('header.driveSyncing') : t('header.driveOn')}
                </button>
              ) : (
                <button
                  onClick={handleConnectDrive}
                  title={t('header.connectDriveTooltip')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-blue-100 transition-colors"
                >
                  <CloudOff size={16} /> {t('header.connectDrive')}
                </button>
              )
            )}

            <button
              onClick={toggleLanguage}
              title="Switch language / החלף שפה"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-blue-100 transition-colors"
            >
              <Languages size={16} />
              {i18n.language === 'en' ? 'עב' : 'EN'}
            </button>

            <div className="flex bg-white/10 rounded-lg p-1">
              <button onClick={handleExport} title={t('header.downloadTooltip')} className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded text-white transition-colors border border-green-400/30">
                <Download size={18} />
              </button>
              <label className="p-2 hover:bg-white/20 rounded text-white transition-colors cursor-pointer" title={t('header.uploadTooltip')}>
                <Upload size={18} />
                <input id="main-file-upload" type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex px-6 gap-2 mt-2">
          {[
            { key: 'board', icon: <Layout size={16} /> },
            { key: 'list', icon: <List size={16} /> },
            { key: 'timeline', icon: <Calendar size={16} /> },
          ].map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === key ? 'bg-gray-50 text-indigo-800' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}
            >
              {icon} {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'board' && renderBoard()}
      {activeTab === 'timeline' && renderTimeline()}

      {activeTab === 'list' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
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
                filteredCompanies.map(company => {
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
                })
              )}
            </div>
          </div>

          {/* Detail / Edit panel */}
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
                      <select value={formData.priority || 'medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                        {PRIORITIES.map(p => <option key={p.id} value={p.id}>{t(`priority.${p.id}`)}</option>)}
                      </select>
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
                          <select
                            value={safeStr(interview.type)}
                            onChange={e => { const a = [...formData.interviews]; a[index].type = e.target.value; setFormData({...formData, interviews: a}); }}
                            className="w-full p-2 text-sm border rounded bg-white"
                          >
                            <option value="" disabled>{t('form.selectInterviewType')}</option>
                            {INTERVIEW_TYPE_KEYS.map(key => <option key={key} value={key}>{t(`interviewType.${key}`, key)}</option>)}
                            {interview.type && !INTERVIEW_TYPE_KEYS.includes(interview.type) && <option value={safeStr(interview.type)}>{safeStr(interview.type)}</option>}
                          </select>
                          <input type="date" value={safeStr(interview.date)} onChange={e => { const a = [...formData.interviews]; a[index].date = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded" />
                          <input type="text" placeholder={t('form.interviewerPlaceholder')} value={safeStr(interview.interviewer)} onChange={e => { const a = [...formData.interviews]; a[index].interviewer = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded" />
                        </div>
                        <textarea placeholder={t('form.summaryPlaceholder')} value={safeStr(interview.summary)} onChange={e => { const a = [...formData.interviews]; a[index].summary = e.target.value; setFormData({...formData, interviews: a}); }} className="w-full p-2 text-sm border rounded h-16"></textarea>
                      </div>
                    ))}
                  </div>

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
    </div>
  );
}
