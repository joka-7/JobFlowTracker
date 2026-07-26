import { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import ModeSelection from './components/ModeSelection';
import UpdateBanner from './components/UpdateBanner';
import { resolveInitialAppMode } from './statuses';
import { completeRedirectSignIn } from './firebase';

// Job seeker/recruiter and task manager are two separate large UIs — a user
// in one mode never needs the other's code, so split them at the mode gate
// instead of shipping both in the entry bundle.
const JobTrackerApp = lazy(() => import('./JobTrackerApp'));
const TasksApp = lazy(() => import('./TasksApp'));

function AppLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-dvh bg-gray-50">
      <Loader2 className="animate-spin text-gray-400" size={28} />
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(() => resolveInitialAppMode());

  useEffect(() => {
    completeRedirectSignIn().catch((e) => console.error('Redirect sign-in:', e));
  }, []);

  if (!mode) {
    return (
      <>
        <UpdateBanner />
        <ModeSelection onSelect={setMode} />
      </>
    );
  }

  return (
    <Suspense fallback={<AppLoadingFallback />}>
      {mode === 'tasks'
        ? <TasksApp key="tasks" onModeChange={setMode} />
        : <JobTrackerApp mode={mode} onModeChange={setMode} />}
    </Suspense>
  );
}
