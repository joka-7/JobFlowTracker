import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Download, Upload, Layout, List, BarChart2,
  Trash2, Edit2, ArrowLeft, ArrowRight, CheckCircle2, Circle,
  Clock, AlertCircle, ChevronDown, Calendar, Cloud, CloudOff,
  ClipboardList, X, GripVertical,
} from 'lucide-react';
import {
  signInWithGoogle, signOut, onAuthChange, loadAllItems,
  updateItem, deleteItem, batchSaveItems, loadUserProfile, saveUserProfile,
} from './firebase';
import { getStorageKey, STATUSES_TASKS } from './statuses';
import ModeSwitcher from './components/ModeSwitcher';
import CalendarView from './components/CalendarView';

const MODE = 'tasks';

const safeStr = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return String(v);
};

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STEP_STATUS_CONFIG = {
  todo: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50', label: 'todo' },
  in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', label: 'in_progress' },
  done: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'done' },
  blocked: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'blocked' },
};

const STEP_STATUS_CYCLE = ['todo', 'in_progress', 'done', 'blocked'];

const cycleStepStatus = (current) => {
  const idx = STEP_STATUS_CYCLE.indexOf(current);
  return STEP_STATUS_CYCLE[(idx + 1) % STEP_STATUS_CYCLE.length];
};

const makeInitialTask = () => ({
  name: '',
  description: '',
  status: 'active',
  priority: 'medium',
  dueDate: '',
  steps: [],
  notes: '',
});

const getProgress = (task) => {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  if (steps.length === 0) return null;
  const done = steps.filter(s => s.status === 'done').length;
  return { done, total: steps.length };
};

const getNextPendingStep = (task) => {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  return steps.find(s => s.status !== 'done' && s.status !== 'blocked') || null;
};

const formatDate = (dateStr, lang) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(d);
  } catch { return dateStr; }
};

const getAvatarColor = (name) => {
  const s = safeStr(name);
  if (!s) return 'bg-gray-500';
  const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-green-500', 'bg-lime-600', 'bg-indigo-500', 'bg-violet-500'];
  const idx = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[idx % colors.length];
};

export default function TasksApp({ onModeChange }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const lang = i18n.language;

  const tt = (key, fb) => t(`tasks.${key}`, fb);

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(MODE));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  const [selectedId, setSelectedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(makeInitialTask());
  const [activeTab, setActiveTab] = useState('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [visibleCount, setVisibleCount] = useState(25);

  const dragTaskId = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

  useEffect(() => {
    try {
      if (tasks.length > 0 || localStorage.getItem(getStorageKey(MODE))) {
        setIsSaved(false);
        localStorage.setItem(getStorageKey(MODE), JSON.stringify(tasks));
        const timer = setTimeout(() => setIsSaved(true), 800);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, [tasks]);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setSyncing(true);
        try {
          await saveUserProfile(firebaseUser.uid, { appMode: MODE });
          const data = await loadAllItems(firebaseUser.uid, MODE);
          if (data && data.length > 0) {
            setTasks(data);
            showToast(tt('toast.imported', 'Data loaded from cloud!'));
          }
        } catch (e) { console.error(e); }
        setSyncing(false);
      }
    });
    return unsub;
  }, []);

  const saveTasks = useCallback(async (newTasks) => {
    setTasks(newTasks);
    if (user) {
      try {
        await batchSaveItems(user.uid, MODE, newTasks);
      } catch { /* ignore */ }
    }
  }, [user]);

  const saveTask = useCallback(async (task) => {
    setTasks(prev => {
      const exists = prev.find(t => t.id === task.id);
      return exists ? prev.map(t => t.id === task.id ? task : t) : [task, ...prev];
    });
    if (user) {
      try { await updateItem(user.uid, MODE, task); } catch { /* ignore */ }
    }
  }, [user]);

  const deleteTask = useCallback(async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user) {
      try { await deleteItem(user.uid, MODE, id); } catch { /* ignore */ }
    }
  }, [user]);

  const openNewForm = useCallback(() => {
    setFormData(makeInitialTask());
    setSelectedId(null);
    setIsEditing(true);
    setNewStepTitle('');
    setActiveTab('list');
  }, []);

  const openEditForm = useCallback((task) => {
    setFormData({ ...task, steps: Array.isArray(task.steps) ? [...task.steps] : [] });
    setIsEditing(true);
    setNewStepTitle('');
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

  // Browser back/forward support
  const navigateTo = useCallback((tab, taskId = null) => {
    const state = { tab, selectedId: taskId };
    window.history.pushState(state, '');
    setActiveTab(tab);
    if (taskId) {
      setSelectedId(taskId);
      setIsEditing(false);
    }
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state;
      if (!s) return;
      setActiveTab(s.tab || 'board');
      setSelectedId(s.selectedId || null);
      setIsEditing(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleSave = async () => {
    if (!safeStr(formData.name).trim()) {
      alert(tt('form.requiredName', 'Task name is required'));
      return;
    }
    const task = {
      ...formData,
      id: formData.id || Date.now().toString(),
      name: safeStr(formData.name).trim(),
    };
    await saveTask(task);
    setSelectedId(task.id);
    setIsEditing(false);
    showToast(tt('toast.saved', 'Task saved!'));
  };

  const handleDelete = async (id) => {
    if (!window.confirm(tt('alert.deleteConfirm', 'Delete this task?'))) return;
    await deleteTask(id);
    setSelectedId(null);
    setIsEditing(false);
    showToast(tt('toast.deleted', 'Task deleted.'));
  };

  const handleStepStatusToggle = useCallback(async (taskId, stepId) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== taskId) return task;
        const steps = (task.steps || []).map(s =>
          s.id === stepId ? { ...s, status: cycleStepStatus(s.status) } : s
        );
        return { ...task, steps };
      });
      const task = updated.find(t => t.id === taskId);
      if (task && user) {
        updateItem(user.uid, MODE, task).catch(() => {});
      }
      return updated;
    });
  }, [user]);

  const handleFormStepToggle = (stepId) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).map(s =>
        s.id === stepId ? { ...s, status: cycleStepStatus(s.status) } : s
      ),
    }));
  };

  const handleAddStep = () => {
    const title = newStepTitle.trim();
    if (!title) return;
    const newStep = { id: Date.now().toString() + Math.random(), title, status: 'todo', notes: '', dueDate: '' };
    setFormData(prev => ({ ...prev, steps: [...(prev.steps || []), newStep] }));
    setNewStepTitle('');
  };

  const handleDeleteStep = (stepId) => {
    setFormData(prev => ({ ...prev, steps: (prev.steps || []).filter(s => s.id !== stepId) }));
  };

  const handleDragStart = (taskId) => { dragTaskId.current = taskId; };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (statusId) => {
    const id = dragTaskId.current;
    if (!id) return;
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status: statusId } : t);
      const task = updated.find(t => t.id === id);
      if (task && user) updateItem(user.uid, MODE, task).catch(() => {});
      return updated;
    });
    dragTaskId.current = null;
    showToast(tt('toast.saved', 'Saved!'));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(tt('toast.exported', 'Backup downloaded!'));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('not array');
        const sanitized = data.map(t => ({
          id: String(t.id || Date.now()),
          name: safeStr(t.name) || 'Unnamed',
          description: safeStr(t.description),
          status: STATUSES_TASKS.find(s => s.id === t.status) ? t.status : 'active',
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          dueDate: safeStr(t.dueDate),
          steps: Array.isArray(t.steps) ? t.steps : [],
          notes: safeStr(t.notes),
        }));
        saveTasks(sanitized);
        showToast(tt('toast.imported', 'File loaded!'));
      } catch {
        alert(tt('alert.importError', 'Error importing file.'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedTask = selectedId ? tasks.find(t => t.id === selectedId) : null;

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        safeStr(t.name).toLowerCase().includes(q) ||
        safeStr(t.description).toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter(t => t.status === 'active').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const allSteps = tasks.flatMap(t => t.steps || []);
    const totalSteps = allSteps.length;
    const doneSteps = allSteps.filter(s => s.status === 'done').length;
    const byStatus = {};
    STATUSES_TASKS.forEach(s => { byStatus[s.id] = tasks.filter(t => t.status === s.id).length; });
    return { total, active, completed, totalSteps, doneSteps, byStatus };
  }, [tasks]);

  const calendarEvents = useMemo(() =>
    tasks.filter(t => t.dueDate).map(t => ({
      date: t.dueDate,
      title: t.name,
      type: 'task',
      parentId: t.id,
    }))
  , [tasks]);

  const renderStepStatusBadge = (status) => {
    const cfg = STEP_STATUS_CONFIG[status] || STEP_STATUS_CONFIG.todo;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
        <Icon size={11} />
        {tt(`stepStatus.${status}`, status)}
      </span>
    );
  };

  const renderProgressBar = (task) => {
    const prog = getProgress(task);
    if (!prog) return null;
    const pct = prog.total === 0 ? 0 : Math.round((prog.done / prog.total) * 100);
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{prog.done}/{prog.total} {tt('detail.progress', 'steps')}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const renderBoard = () => (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-slate-50 min-h-0">
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-sm">
            <ClipboardList className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">{tt('board.emptyTitle', 'Welcome to Task Manager')}</h2>
            <p className="text-gray-500 mb-6">{tt('board.emptyDesc', 'Add your first task to get started.')}</p>
            <button
              onClick={openNewForm}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              {tt('board.addFirstButton', 'Add your first task')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 h-full min-w-max pb-4">
          {STATUSES_TASKS.map(status => {
            const columnTasks = tasks.filter(t => t.status === status.id);
            return (
              <div
                key={status.id}
                className="flex flex-col w-72 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status.id)}
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${status.color}`}>
                      {tt(`status.${status.id}`, status.id)}
                    </span>
                    <span className="text-gray-400 text-sm font-medium">{columnTasks.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {columnTasks.map(task => {
                    const prog = getProgress(task);
                    const next = getNextPendingStep(task);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onClick={() => navigateTo('list', task.id)}
                        className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-gray-800 text-sm leading-snug flex-1">{safeStr(task.name)}</p>
                          <GripVertical size={14} className="text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400" />
                        </div>
                        {task.priority && (
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {t(`priority.${task.priority}`, task.priority)}
                          </span>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Calendar size={10} />
                            {formatDate(task.dueDate, lang)}
                          </div>
                        )}
                        {renderProgressBar(task)}
                        {next && (
                          <div className="mt-2 text-xs text-gray-500 truncate">
                            <span className="text-gray-400">{tt('detail.nextStep', 'Next')}: </span>
                            {safeStr(next.title)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStepRow = (step, editable, taskId) => {
    const cfg = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.todo;
    const Icon = cfg.icon;
    return (
      <div key={step.id} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} border-gray-100 group`}>
        <button
          onClick={() => editable ? handleFormStepToggle(step.id) : handleStepStatusToggle(taskId, step.id)}
          className={`mt-0.5 shrink-0 ${cfg.color} hover:opacity-70 transition-opacity`}
          title={tt(`stepStatus.${step.status}`, step.status)}
        >
          <Icon size={18} />
        </button>
        <div className="flex-1 min-w-0">
          {editable ? (
            <input
              value={safeStr(step.title)}
              onChange={e => setFormData(prev => ({
                ...prev,
                steps: prev.steps.map(s => s.id === step.id ? { ...s, title: e.target.value } : s),
              }))}
              className="w-full text-sm font-medium bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400"
              placeholder={tt('form.addStepPlaceholder', 'Describe the step...')}
            />
          ) : (
            <p className={`text-sm font-medium ${step.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {safeStr(step.title)}
            </p>
          )}
          {step.notes && !editable && (
            <p className="text-xs text-gray-500 mt-0.5">{safeStr(step.notes)}</p>
          )}
          {editable && (
            <input
              value={safeStr(step.notes)}
              onChange={e => setFormData(prev => ({
                ...prev,
                steps: prev.steps.map(s => s.id === step.id ? { ...s, notes: e.target.value } : s),
              }))}
              className="w-full text-xs text-gray-500 bg-transparent border-0 outline-none mt-0.5 placeholder-gray-300"
              placeholder={tt('form.stepNotesPlaceholder', 'Step notes...')}
            />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editable && renderStepStatusBadge(step.status)}
          {editable && (
            <button
              onClick={() => handleDeleteStep(step.id)}
              className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (isEditing) {
      const steps = formData.steps || [];
      return (
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <h2 className="text-lg font-bold text-gray-800 mb-5">
            {formData.id ? tt('form.editTitle', 'Edit Task') : tt('form.addTitle', 'Add New Task')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {tt('form.taskName', 'Task Name *')}
              </label>
              <input
                value={safeStr(formData.name)}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                placeholder={tt('form.taskNamePlaceholder', 'What needs to be done?')}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {tt('form.status', 'Status')}
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                >
                  {STATUSES_TASKS.map(s => (
                    <option key={s.id} value={s.id}>{tt(`status.${s.id}`, s.id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {tt('form.priority', 'Priority')}
                </label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                >
                  {['high', 'medium', 'low'].map(p => (
                    <option key={p} value={p}>{t(`priority.${p}`, p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {tt('form.dueDate', 'Due Date')}
              </label>
              <input
                type="date"
                value={safeStr(formData.dueDate)}
                onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {tt('form.description', 'Description')}
              </label>
              <textarea
                value={safeStr(formData.description)}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
                placeholder={tt('form.descriptionPlaceholder', 'Goal, context...')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {tt('form.steps', 'Steps')} ({steps.length})
              </label>
              <div className="space-y-2 mb-3">
                {steps.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-2">{tt('form.noSteps', 'No steps yet.')}</p>
                )}
                {steps.map(step => renderStepRow(step, true, null))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newStepTitle}
                  onChange={e => setNewStepTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); } }}
                  placeholder={tt('form.addStepPlaceholder', 'Describe the step...')}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={handleAddStep}
                  className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {tt('form.notes', 'Notes')}
              </label>
              <textarea
                value={safeStr(formData.notes)}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
                placeholder={tt('form.notesPlaceholder', 'Any additional notes...')}
              />
            </div>

            <div className={`flex gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
              >
                {tt('form.save', 'Save Changes')}
              </button>
              <button
                onClick={() => { setIsEditing(false); if (!selectedTask) setSelectedId(null); }}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                {tt('form.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!selectedTask) {
      return (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div>
            <ClipboardList className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-400">{tt('list.selectTask', 'Select a task from the list')}</p>
          </div>
        </div>
      );
    }

    const task = selectedTask;
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const prog = getProgress(task);
    const statusDef = STATUSES_TASKS.find(s => s.id === task.status);

    return (
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 leading-tight">{safeStr(task.name)}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {statusDef && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusDef.color}`}>
                  {tt(`status.${task.status}`, task.status)}
                </span>
              )}
              {task.priority && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${PRIORITY_COLORS[task.priority]}`}>
                  {t(`priority.${task.priority}`, task.priority)}
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar size={11} />
                  {formatDate(task.dueDate, lang)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openEditForm(task)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Edit2 size={13} />
              {tt('detail.editDetails', 'Edit')}
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{safeStr(task.description)}</p>
        )}

        {prog && (
          <div className="mb-4">
            {renderProgressBar(task)}
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {tt('form.steps', 'Steps')} ({steps.length})
          </h3>
          {steps.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{tt('detail.noSteps', 'No steps. Click "Edit Details" to add.')}</p>
          ) : (
            <div className="space-y-2">
              {steps.map(step => renderStepRow(step, false, task.id))}
            </div>
          )}
        </div>

        {task.notes && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{tt('detail.notes', 'Notes')}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{safeStr(task.notes)}</p>
          </div>
        )}
      </div>
    );
  };

  const renderList = () => {
    const visible = filteredTasks.slice(0, visibleCount);
    const remaining = filteredTasks.length - visible.length;

    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className={`w-72 shrink-0 flex flex-col border-gray-200 ${isRTL ? 'border-l' : 'border-r'} bg-white`}>
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={tt('list.searchPlaceholder', 'Search tasks...')}
                className={`w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="all">{tt('list.allStatuses', 'All Statuses')}</option>
              {STATUSES_TASKS.map(s => (
                <option key={s.id} value={s.id}>{tt(`status.${s.id}`, s.id)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {visible.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {tasks.length === 0 ? tt('list.noTasks', 'No tasks yet.') : tt('list.noResults', 'No results found.')}
              </div>
            ) : (
              <>
                {visible.map(task => {
                  const prog = getProgress(task);
                  const statusDef = STATUSES_TASKS.find(s => s.id === task.status);
                  const isSelected = selectedId === task.id;
                  return (
                    <button
                      key={task.id}
                      onClick={() => { setSelectedId(task.id); setIsEditing(false); }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-emerald-50 border-r-2 border-r-emerald-500' : ''}`}
                    >
                      <p className="font-semibold text-gray-800 text-sm truncate">{safeStr(task.name)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {statusDef && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${statusDef.color}`}>
                            {tt(`status.${task.status}`, task.status)}
                          </span>
                        )}
                        {prog && (
                          <span className="text-xs text-gray-400">{prog.done}/{prog.total}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {remaining > 0 && (
                  <button
                    onClick={() => setVisibleCount(v => v + 25)}
                    className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                  >
                    {tt('list.loadMore', 'Load more')} ({remaining} {tt('list.remaining', 'remaining')})
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {renderDetailPanel()}
      </div>
    );
  };

  const renderStats = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart2 className="text-emerald-600" /> {tt('stats.title', 'Statistics')}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: tt('stats.total', 'Tasks'), value: stats.total, color: 'text-emerald-600' },
            { label: tt('stats.active', 'Active'), value: stats.active, color: 'text-blue-600' },
            { label: tt('stats.completed', 'Completed'), value: stats.completed, color: 'text-green-600' },
            { label: tt('stats.doneSteps', 'Steps Done'), value: `${stats.doneSteps}/${stats.totalSteps}`, color: 'text-purple-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
              <div className={`text-3xl font-black mb-1 ${card.color}`}>{card.value}</div>
              <div className="text-sm text-gray-500 font-medium">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">{tt('stats.byStatus', 'By Status')}</h3>
          <div className="space-y-3">
            {STATUSES_TASKS.map(s => {
              const count = stats.byStatus[s.id] || 0;
              const pct = stats.total === 0 ? 0 : Math.round((count / stats.total) * 100);
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${s.color}`}>
                      {tt(`status.${s.id}`, s.id)}
                    </span>
                    <span className="text-gray-600 font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {stats.total > 0 && stats.totalSteps > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">{tt('stats.doneSteps', 'Steps Done')}</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-emerald-600">
                {stats.totalSteps === 0 ? 0 : Math.round((stats.doneSteps / stats.totalSteps) * 100)}%
              </div>
              <div className="flex-1">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${stats.totalSteps === 0 ? 0 : Math.round((stats.doneSteps / stats.totalSteps) * 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">{stats.doneSteps} / {stats.totalSteps} {tt('form.steps', 'steps')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const TABS = [
    { id: 'board', icon: Layout, label: t('tabs.board', 'Board') },
    { id: 'list', icon: List, label: t('tabs.list', 'List & Edit') },
    { id: 'calendar', icon: Calendar, label: t('tabs.calendar', 'Calendar') },
    { id: 'stats', icon: BarChart2, label: t('tabs.stats', 'Statistics') },
  ];

  return (
    <div className="flex flex-col h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClipboardList size={22} className="text-emerald-200 shrink-0" />
          <span className="font-black text-lg tracking-tight truncate">{tt('header.title', 'Task Manager')}</span>
          <span className="hidden sm:inline text-xs text-emerald-300 font-medium">
            {isSaved ? tt('header.savedInBrowser', 'Saved') : tt('header.saving', 'Saving...')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={openNewForm}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{tt('header.addTask', 'Add Task')}</span>
          </button>
          <button onClick={handleExport} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Export">
            <Download size={16} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Import">
            <Upload size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          {onModeChange && (
            <ModeSwitcher currentMode={MODE} onModeChange={onModeChange} />
          )}
          {user ? (
            <button onClick={() => signOut()} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title={user.email}>
              {syncing ? <Cloud size={16} className="animate-pulse" /> : <Cloud size={16} />}
            </button>
          ) : (
            <button onClick={() => signInWithGoogle().catch(() => {})} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Sign in">
              <CloudOff size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-0 shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigateTo(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'board' && renderBoard()}
        {activeTab === 'list' && renderList()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'calendar' && (
          <div className="flex-1 overflow-auto bg-gray-50">
            <CalendarView
              events={calendarEvents}
              isRTL={isRTL}
              onEventClick={ev => { navigateTo('list', ev.parentId); }}
            />
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-xl text-sm font-medium z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
