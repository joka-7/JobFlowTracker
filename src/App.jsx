import { useState } from 'react';
import JobTrackerApp from './JobTrackerApp';
import TasksApp from './TasksApp';
import ModeSelection from './components/ModeSelection';
import { resolveInitialAppMode } from './statuses';

export default function App() {
  const [mode, setMode] = useState(() => resolveInitialAppMode());

  if (!mode) {
    return <ModeSelection onSelect={setMode} />;
  }

  if (mode === 'tasks') {
    return <TasksApp />;
  }

  return <JobTrackerApp mode={mode} />;
}
