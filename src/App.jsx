import { useState, useEffect } from 'react';
import JobTrackerApp from './JobTrackerApp';
import TasksApp from './TasksApp';
import ModeSelection from './components/ModeSelection';
import { resolveInitialAppMode } from './statuses';
import { completeRedirectSignIn } from './firebase';

export default function App() {
  const [autoOnboarding] = useState(() => !resolveInitialAppMode());
  const [mode, setMode] = useState(() => resolveInitialAppMode());

  useEffect(() => {
    completeRedirectSignIn().catch((e) => console.error('Redirect sign-in:', e));
  }, []);

  if (!mode) {
    return <ModeSelection onSelect={setMode} />;
  }

  if (mode === 'tasks') {
    return <TasksApp key="tasks" onModeChange={setMode} />;
  }

  return <JobTrackerApp mode={mode} onModeChange={setMode} autoOnboarding={autoOnboarding} />;
}
