import { useState } from 'react';
import JobTrackerApp from './JobTrackerApp';
import ModeSelection from './components/ModeSelection';
import { resolveInitialAppMode } from './statuses';

export default function App() {
  const [mode, setMode] = useState(() => resolveInitialAppMode());

  if (!mode) {
    return <ModeSelection onSelect={setMode} />;
  }

  return <JobTrackerApp mode={mode} />;
}
