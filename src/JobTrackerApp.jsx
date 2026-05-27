import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, MapPin, Globe, Calendar,
  User, CheckCircle, Clock, Trash2, Edit2,
  ArrowRight, Download, Upload, Filter, Layout, List, Activity, AlertTriangle
} from 'lucide-react';

const Linkedin = ({ size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

// ==========================================
// מנגנוני הגנה - חסינות קריסות מוחלטת
// ==========================================
const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return '[מידע מורכב]';
    }
  }
  return String(val);
};

// ==========================================
// קבועים והגדרות 
// ==========================================

const STATUSES = [
  { id: 'applied', label: 'נשלחו קורות חיים', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'hr_call', label: 'שיחת משאבי אנוש', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'tech_interview', label: 'ראיון טכני', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'manager_interview', label: 'ראיון מנהל', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'home_assignment', label: 'עבודת בית', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'references', label: 'בדיקת ממליצים', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'offer', label: 'הצעת שכר', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'frozen', label: 'הוקפא', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'rejected', label: 'נדחה', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'ghosted', label: 'נעלמו (Ghosted)', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'withdrawn', label: 'ויתרתי / הוסר', color: 'bg-stone-100 text-stone-700 border-stone-300' },
];

const PRIORITIES = [
  { id: 'high', label: 'גבוהה', color: 'bg-red-500' },
  { id: 'medium', label: 'בינונית', color: 'bg-orange-500' },
  { id: 'low', label: 'נמוכה', color: 'bg-blue-500' },
];

const INTERVIEW_TYPES = [
  'שיחת היכרות / HR',
  'ראיון טכני',
  'ראיון מנהל',
  'מבחן בית / מטלה',
  'ראיון סמנכ״ל / מנכ״ל',
  'בדיקת ממליצים',
  'הצעת שכר',
  'אחר'
];

// ==========================================
// פונקציות עזר 
// ==========================================

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

const formatDate = (dateString) => {
  const strDate = safeStr(dateString);
  if (!strDate) return '';
  try {
    const date = new Date(strDate);
    if (isNaN(date.getTime())) return strDate;
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch (e) {
    return strDate;
  }
};

// ==========================================
// רכיב ראשי
// ==========================================

export default function JobTrackerApp() {
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
    } catch (e) {
      return [];
    }
  });

  const [selectedId, setSelectedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('board');
  const [toastMessage, setToastMessage] = useState('');

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
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [companies]);

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
          if (interview && interview.date) events.push({ ...interview, companyName: safeStr(company.name || company.company || 'ללא שם'), eventType: 'ראיון', parentId: company.id });
        });
      }
      if (Array.isArray(company.homeworks)) {
        company.homeworks.forEach(hw => {
          if (hw && hw.deadline) events.push({ ...hw, date: hw.deadline, companyName: safeStr(company.name || company.company || 'ללא שם'), eventType: 'הגשת עבודה', parentId: company.id });
        });
      }
    });
    return events.sort((a, b) => new Date(safeStr(b.date)) - new Date(safeStr(a.date)));
  }, [companies]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSave = () => {
    if (!formData.name) {
      alert("חובה להזין שם חברה");
      return;
    }

    if (formData.id) {
      setCompanies(companies.map(c => String(c.id) === String(formData.id) ? formData : c));
    } else {
      const newCompany = { ...formData, id: Date.now().toString() };
      setCompanies([newCompany, ...companies]);
      setSelectedId(newCompany.id);
    }
    
    setIsEditing(false);
    showToast('השינויים נשמרו בהצלחה!');
  };

  const handleDelete = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חברה זו?')) {
      setCompanies(prev => prev.filter(c => String(c.id) !== String(id)));
      setSelectedId(null);
      setIsEditing(false);
      showToast('החברה נמחקה.');
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
    showToast('קובץ גיבוי הורד בהצלחה - שמור אותו במקום בטוח!');
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
            if (potentialArray) {
              importedArray = potentialArray;
            } else {
              importedArray = [importedRaw];
            }
          }

          if (importedArray.length > 0) {
            const sanitizedData = importedArray.map((c, idx) => {
              const companyName = safeStr(c.name || c.company || 'חברה ללא שם');
              const companyRole = safeStr(c.role || c.position || '');
              
              const safeInterviews = Array.isArray(c.interviews) ? c.interviews.map(inv => ({
                ...inv,
                type: safeStr(inv.type || inv.round || '')
              })) : [];

              return {
                ...c,
                name: companyName,
                role: companyRole,
                interviews: safeInterviews,
                id: c.id ? String(c.id) : Date.now().toString() + idx
              };
            });
            
            setCompanies(sanitizedData);
            showToast('הקובץ נטען בהצלחה! הנתונים מוגנים מקריסה.');
          } else {
            alert('לא זוהו נתוני חברות בקובץ שהועלה.');
          }
        } catch (error) {
          alert('שגיאה בייבוא הקובץ. ודא שזהו קובץ JSON חוקי ששמרת מקודם.');
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

  // פונקציה שעוזרת ללחוץ על כפתור ההעלאה המוסתר מכל מקום
  const triggerFileInput = () => {
    document.getElementById('main-file-upload').click();
  };

  // --- לוח קנבן ---
  const renderBoard = () => (
    <div className="flex-1 overflow-x-auto p-6 bg-slate-50 min-h-0 flex gap-6 dir-rtl">
      {STATUSES.map(statusObj => {
        const statusCompanies = companies.filter(c => c.status === statusObj.id);
        if (statusCompanies.length === 0) return null; 
        
        return (
          <div key={statusObj.id} className="w-80 flex-shrink-0 flex flex-col h-full">
            <div className={`rounded-t-xl px-4 py-3 font-bold border-b-4 shadow-sm ${statusObj.color} bg-opacity-30`}>
              {statusObj.label} ({statusCompanies.length})
            </div>
            <div className="bg-gray-100 rounded-b-xl p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {statusCompanies.map(company => (
                <div 
                  key={company.id} 
                  onClick={() => { selectCompany(company); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow relative"
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
            <h2 className="text-2xl font-black text-gray-800 mb-4">המערכת מוכנה לנתונים שלך</h2>
            <p className="text-gray-600 mb-8">
              כדי להתחיל, בחר את קובץ ה-JSON הפיזי ששמרת במכשיר שלך. מנגנון ההגנה יוודא שהקובץ יעלה בהצלחה ללא קריסות.
            </p>
            <button 
              onClick={triggerFileInput}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <Upload size={24} /> טען נתונים מקובץ גיבוי (JSON)
            </button>
            <div className="mt-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg flex items-start gap-3 text-right">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
              <p>
                <strong>שים לב:</strong> בסיום העבודה להיום, אל תשכח ללחוץ על סמל ההורדה בסרגל העליון כדי לשמור עותק חדש ועדכני אצלך במחשב.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- ציר זמן ---
  const renderTimeline = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 dir-rtl custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          <Activity className="text-blue-600"/> היסטוריית פעילויות
        </h2>
        
        {timelineEvents.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">אין אירועים להצגה על ציר הזמן.</div>
        ) : (
          <div className="relative border-r-2 border-blue-200 pr-6 space-y-8">
            {timelineEvents.map((event, index) => (
              <div key={index} className="relative">
                <div className="absolute -right-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded-md ${event.eventType === 'ראיון' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {safeStr(event.eventType)}
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
                      <User size={14} /> מראיין/ת: {safeStr(event.interviewer)}
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
    <div className="flex flex-col h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold transition-all">
          {toastMessage}
        </div>
      )}

      {/* סרגל עליון */}
      <header className="bg-gradient-to-l from-blue-700 to-indigo-800 text-white shadow-md flex-shrink-0">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                מעקב חיפוש עבודה 
                {companies.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${isSaved ? 'bg-green-500/20 text-green-100' : 'bg-yellow-500/50 text-yellow-50'}`}>
                    {isSaved ? <CheckCircle size={12}/> : <Clock size={12}/>}
                    {isSaved ? 'שמור בדפדפן' : 'שומר...'}
                  </span>
                )}
              </h1>
              <p className="text-blue-200 text-sm">הקפד להוריד גיבוי (JSON) בסיום העבודה</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={openNewForm} className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
              <Plus size={18} /> הוסף חברה
            </button>
            
            <div className="flex bg-white/10 rounded-lg p-1">
              <button onClick={handleExport} title="הורד עותק גיבוי למחשב (מומלץ!)" className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded text-white transition-colors border border-green-400/30">
                <Download size={18} />
              </button>
              <label className="p-2 hover:bg-white/20 rounded text-white transition-colors cursor-pointer" title="טען קובץ גיבוי קיים">
                <Upload size={18} />
                <input id="main-file-upload" type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* טאבים */}
        <div className="flex px-6 gap-2 mt-2">
          <button 
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'board' ? 'bg-gray-50 text-indigo-800' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}
          >
            <Layout size={16} /> לוח סטטוסים
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'list' ? 'bg-gray-50 text-indigo-800' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}
          >
            <List size={16} /> רשימה ועריכה
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'timeline' ? 'bg-gray-50 text-indigo-800' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}
          >
            <Calendar size={16} /> ציר זמן
          </button>
        </div>
      </header>

      {/* אזור תוכן */}
      {activeTab === 'board' && renderBoard()}
      {activeTab === 'timeline' && renderTimeline()}
      
      {activeTab === 'list' && (
        <div className="flex flex-1 overflow-hidden">
          {/* רשימת חברות צד ימין */}
          <div className={`w-full md:w-1/3 lg:w-1/4 flex-shrink-0 bg-white border-l border-gray-200 flex-col ${selectedId || isEditing ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="חיפוש חברה..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="relative">
                <Filter className="absolute right-3 top-2.5 text-gray-400" size={16} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                >
                  <option value="all">כל הסטטוסים</option>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredCompanies.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  לא נמצאו תוצאות.
                </div>
              ) : (
                filteredCompanies.map(company => {
                  const statusInfo = STATUSES.find(s => s.id === company.status);
                  const priorityInfo = PRIORITIES.find(p => p.id === company.priority);
                  const isSelected = selectedId === company.id;
                  
                  return (
                    <div
                      key={company.id}
                      onClick={() => selectCompany(company)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected ? `bg-indigo-50 border-indigo-200 shadow-sm border ring-1 ring-indigo-500` : 'hover:bg-gray-50 border border-transparent'
                      }`}
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
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusInfo?.color || 'bg-gray-100 border-gray-200'}`}>
                              {statusInfo?.label || 'לא ידוע'}
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

          {/* אזור תצוגה ועריכה */}
          <div className={`flex-1 flex-col bg-slate-50 overflow-y-auto relative custom-scrollbar ${!selectedId && !isEditing ? 'hidden md:flex' : 'flex'}`}>
            
            {(selectedId || isEditing) && (
              <div className="md:hidden sticky top-0 bg-white/90 backdrop-blur-sm p-3 border-b border-gray-200 z-10">
                <button onClick={() => { setSelectedId(null); setIsEditing(false); }} className="flex items-center gap-2 text-indigo-600 font-bold">
                  <ArrowRight size={18} /> חזור לרשימה
                </button>
              </div>
            )}

            {isEditing ? (
              <div className="p-6 max-w-4xl mx-auto w-full pb-20">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {formData.id ? 'עריכת פרטי חברה' : 'הוספת חברה חדשה'}
                    </h2>
                    <div className="flex gap-2">
                      <button onClick={() => formData.id ? setIsEditing(false) : setSelectedId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">ביטול</button>
                      <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition">שמור שינויים</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">שם החברה *</label>
                      <input type="text" value={safeStr(formData.name)} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">התפקיד</label>
                      <input type="text" value={safeStr(formData.role)} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">סטטוס תהליך</label>
                      <select value={formData.status || 'applied'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">עדיפות</label>
                      <select value={formData.priority || 'medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                        {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-8">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Globe size={18}/> קישורים ומידע נוסף</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input type="text" placeholder="אתר החברה (URL)" value={safeStr(formData.website)} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                      <input type="text" placeholder="לינקדין החברה" value={safeStr(formData.linkedinCompany)} onChange={e => setFormData({...formData, linkedinCompany: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                      <input type="text" placeholder="מיקום המשרה" value={safeStr(formData.location)} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded-md" />
                    </div>
                    <textarea placeholder="תיאור החברה ומה היא עושה..." value={safeStr(formData.description)} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 mb-3 text-sm border border-gray-300 rounded-md h-20 resize-none"></textarea>
                  </div>

                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><User size={18}/> ראיונות</h3>
                      <button onClick={() => setFormData({...formData, interviews: [...(formData.interviews || []), { type: 'שיחת היכרות / HR', date: '', interviewer: '', summary: '' }]})} className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800">
                        <Plus size={16}/> הוסף ראיון
                      </button>
                    </div>
                    {(formData.interviews || []).map((interview, index) => (
                      <div key={index} className="bg-white p-4 border border-gray-200 rounded-lg mb-3 shadow-sm relative">
                        <button onClick={() => { const newArr = [...formData.interviews]; newArr.splice(index, 1); setFormData({...formData, interviews: newArr}); }} className="absolute top-4 left-4 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 pr-6">
                          <select 
                            value={safeStr(interview.type)} 
                            onChange={e => { const newArr = [...formData.interviews]; newArr[index].type = e.target.value; setFormData({...formData, interviews: newArr}); }} 
                            className="w-full p-2 text-sm border rounded bg-white"
                          >
                            <option value="" disabled>בחר סוג ראיון...</option>
                            {INTERVIEW_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            {interview.type && !INTERVIEW_TYPES.includes(interview.type) && <option value={safeStr(interview.type)}>{safeStr(interview.type)}</option>}
                          </select>
                          <input type="date" value={safeStr(interview.date)} onChange={e => { const newArr = [...formData.interviews]; newArr[index].date = e.target.value; setFormData({...formData, interviews: newArr}); }} className="w-full p-2 text-sm border rounded" />
                          <input type="text" placeholder="שם המראיין/ת" value={safeStr(interview.interviewer)} onChange={e => { const newArr = [...formData.interviews]; newArr[index].interviewer = e.target.value; setFormData({...formData, interviews: newArr}); }} className="w-full p-2 text-sm border rounded" />
                        </div>
                        <textarea placeholder="סיכום שלך, שאלות ששאלו, תחושות..." value={safeStr(interview.summary)} onChange={e => { const newArr = [...formData.interviews]; newArr[index].summary = e.target.value; setFormData({...formData, interviews: newArr}); }} className="w-full p-2 text-sm border rounded h-16"></textarea>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">הערות נוספות</h3>
                    <textarea value={safeStr(formData.generalNotes)} onChange={e => setFormData({...formData, generalNotes: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-indigo-500" placeholder="הקלד כאן מחשבות אישיות..."></textarea>
                  </div>
                </div>
              </div>

            ) : selectedId ? (
              <div className="max-w-5xl mx-auto w-full animate-fade-in">
                {(() => {
                  const company = formData;
                  const statusInfo = STATUSES.find(s => s.id === company.status);
                  const priorityInfo = PRIORITIES.find(p => p.id === company.priority);
                  const bgColorClass = getAvatarColor(company.name).replace('bg-', 'bg-').replace('-500', '-50');

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
                                  {statusInfo?.label || 'לא ידוע'}
                                </span>
                                {priorityInfo && (
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${priorityInfo.color}`}>
                                    עדיפות {priorityInfo.label}
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
                              <Edit2 size={16} /> ערוך פרטים
                            </button>
                            <button onClick={() => handleDelete(company.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition" title="מחק חברה">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-4">
                          {company.website && typeof company.website === 'string' && (
                            <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Globe size={14} /> אתר החברה
                            </a>
                          )}
                          {company.linkedinCompany && typeof company.linkedinCompany === 'string' && (
                            <a href={company.linkedinCompany.startsWith('http') ? company.linkedinCompany : `https://${company.linkedinCompany}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm bg-white/50 px-3 py-1 rounded-md">
                              <Linkedin size={14} /> לינקדין חברה
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                          {(company.description || company.products) && (
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                              <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">על החברה</h3>
                              {company.description && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">מה הם עושים?</h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">{safeStr(company.description)}</p>
                                </div>
                              )}
                              {company.products && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-500 mb-1">מוצרים</h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">{safeStr(company.products)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {company.generalNotes && (
                            <div className="bg-yellow-50 p-5 rounded-xl shadow-sm border border-yellow-100">
                              <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                <CheckCircle size={18} /> הערות אישיות
                              </h3>
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">{safeStr(company.generalNotes)}</p>
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-6 text-xl border-b pb-3 flex items-center gap-2">
                              <User size={20} className="text-indigo-600" /> היסטוריית תהליך
                            </h3>
                            
                            {company.interviews && Array.isArray(company.interviews) && company.interviews.length > 0 ? (
                              <div className="relative border-r-2 border-indigo-100 pr-6 space-y-6">
                                {company.interviews.map((interview, idx) => (
                                  <div key={idx} className="relative">
                                    <div className="absolute -right-[31px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white"></div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900">{safeStr(interview.type) || 'שלב בתהליך'}</h4>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded flex items-center gap-1">
                                          <Calendar size={12}/> {formatDate(interview.date)}
                                        </span>
                                      </div>
                                      {interview.interviewer && (
                                        <p className="text-sm text-gray-500 mb-2">מראיין/ת: {safeStr(interview.interviewer)}</p>
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
                                אין מידע על ראיונות לחברה זו. לחץ על "ערוך פרטים" כדי להוסיף.
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
                <p className="text-xl font-bold mb-2 text-gray-500">בחר חברה מהרשימה</p>
                <p className="text-sm mt-2">או השתמש בלחצני העלאת JSON למעלה כדי לטעון נתונים</p>
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