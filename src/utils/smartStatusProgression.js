/**
 * Smart Status Progression
 * Automatically suggest or update status based on actions like adding interviews
 */

/**
 * Suggest next status based on current status and context
 */
export function suggestNextStatus(currentStatus, context = {}) {
  const { interviewAdded, rejectionDate, offerDate, interviewCount } = context;

  // If rejection date added, suggest "rejected"
  if (rejectionDate && currentStatus !== 'rejected') {
    return 'rejected';
  }

  // If offer date added, suggest "offer"
  if (offerDate && currentStatus !== 'offer') {
    return 'offer';
  }

  // If interview added, suggest "interviewing"
  if (interviewAdded && currentStatus === 'applied') {
    return 'interviewing';
  }

  // If multiple interviews, keep in "interviewing"
  if (interviewCount > 1 && currentStatus !== 'interviewing') {
    return 'interviewing';
  }

  return null; // No suggestion
}

/**
 * Get progression path for a status (what comes next)
 */
export function getProgressionPath(status) {
  const paths = {
    jobseeker: {
      applied: ['interviewing', 'rejected'],
      interviewing: ['offer', 'rejected', 'withdrawn'],
      offer: ['accepted', 'withdrawn'],
      rejected: ['withdrawn'],
      accepted: [],
      withdrawn: [],
    },
    recruiter: {
      sourced: ['contacted', 'rejected'],
      contacted: ['interviewing', 'rejected'],
      interviewing: ['offer', 'rejected', 'withdrawn'],
      offer: ['accepted', 'rejected', 'withdrawn'],
      accepted: [],
      rejected: [],
      withdrawn: [],
    },
    tasks: {
      active: ['on_hold', 'completed'],
      on_hold: ['active', 'completed'],
      completed: [],
      cancelled: [],
    },
  };

  return paths[status] || [];
}

/**
 * Calculate progress percentage based on status
 */
export function calculateProgress(status, mode = 'jobseeker') {
  const progressMap = {
    jobseeker: {
      applied: 25,
      interviewing: 50,
      offer: 75,
      accepted: 100,
      rejected: 0,
      withdrawn: 0,
    },
    recruiter: {
      sourced: 20,
      contacted: 40,
      interviewing: 60,
      offer: 80,
      accepted: 100,
      rejected: 0,
      withdrawn: 0,
    },
    tasks: {
      active: 50,
      on_hold: 0,
      completed: 100,
      cancelled: 0,
    },
  };

  const modeMap = progressMap[mode] || progressMap.jobseeker;
  return modeMap[status] || 0;
}

/**
 * Get color for status
 */
export function getStatusColor(status, mode = 'jobseeker') {
  const colors = {
    // Job Seeker
    applied: 'bg-blue-100 text-blue-800 border-blue-300',
    interviewing: 'bg-purple-100 text-purple-800 border-purple-300',
    offer: 'bg-green-100 text-green-800 border-green-300',
    accepted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    withdrawn: 'bg-gray-100 text-gray-800 border-gray-300',
    // Recruiter
    sourced: 'bg-blue-100 text-blue-800 border-blue-300',
    contacted: 'bg-amber-100 text-amber-800 border-amber-300',
    // Tasks
    active: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Get icon for status
 */
export function getStatusIcon(status) {
  const icons = {
    applied: '📤',
    interviewing: '💬',
    offer: '🎉',
    accepted: '✅',
    rejected: '❌',
    withdrawn: '🚫',
    sourced: '🔍',
    contacted: '📞',
    on_hold: '⏸️',
    completed: '✔️',
    cancelled: '🚫',
    active: '⚡',
  };

  return icons[status] || '•';
}

/**
 * Format status for display
 */
export function formatStatus(status) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
