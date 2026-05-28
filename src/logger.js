const isDev = import.meta.env.DEV;

function log(level, action, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    action,
    ...data,
  };
  if (isDev) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level.toUpperCase()}] ${action}`, data);
  }
  return entry;
}

export const logger = {
  info: (action, data) => log('info', action, data),
  warn: (action, data) => log('warn', action, data),
  error: (action, data) => log('error', action, data),
};
