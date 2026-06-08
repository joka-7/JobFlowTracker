/**
 * Audit Logging
 * Logs all significant data operations for security and compliance
 */

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AI_CALL: 'ai_call',
  SYNC_START: 'sync_start',
  SYNC_SUCCESS: 'sync_success',
  SYNC_ERROR: 'sync_error',
};

class AuditLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  /**
   * Log an action to in-memory audit log
   */
  log(action, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      userId: details.userId || 'anonymous',
      itemType: details.itemType || null, // 'company', 'candidate', 'task'
      itemId: details.itemId || null,
      mode: details.mode || null, // 'jobseeker', 'recruiter', 'tasks'
      status: details.status || null, // 'success', 'error'
      error: details.error || null,
      metadata: details.metadata || {},
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    this.logs.push(entry);

    // Keep array size manageable
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${action}:`, entry);
    }

    return entry;
  }

  /**
   * Get recent logs for a specific action
   */
  getLogsForAction(action, limit = 20) {
    return this.logs
      .filter(log => log.action === action)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get logs for a specific item
   */
  getLogsForItem(itemId, limit = 50) {
    return this.logs
      .filter(log => log.itemId === itemId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit = 50) {
    return this.logs
      .filter(log => log.status === 'error')
      .slice(-limit)
      .reverse();
  }

  /**
   * Export audit logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear logs (should only be done manually by admins)
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      totalLogs: this.logs.length,
      byAction: this.logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      errorCount: this.logs.filter(log => log.status === 'error').length,
      lastLogTime: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
    };
  }
}

// Global audit logger instance
const auditLogger = new AuditLogger();

export default auditLogger;

/**
 * Convenience functions for common logging patterns
 */

export function logItemDelete(userId, itemType, itemId, mode) {
  return auditLogger.log(AUDIT_ACTIONS.DELETE, {
    userId,
    itemType,
    itemId,
    mode,
    status: 'success',
  });
}

export function logItemCreate(userId, itemType, itemId, mode) {
  return auditLogger.log(AUDIT_ACTIONS.CREATE, {
    userId,
    itemType,
    itemId,
    mode,
    status: 'success',
  });
}

export function logItemUpdate(userId, itemType, itemId, mode) {
  return auditLogger.log(AUDIT_ACTIONS.UPDATE, {
    userId,
    itemType,
    itemId,
    mode,
    status: 'success',
  });
}

export function logError(action, error, details = {}) {
  return auditLogger.log(action, {
    status: 'error',
    error: error?.message || String(error),
    ...details,
  });
}

export function logAICall(userId, provider, mode) {
  return auditLogger.log(AUDIT_ACTIONS.AI_CALL, {
    userId,
    mode,
    metadata: { provider },
  });
}

export function logSync(status, details = {}) {
  const action = status === 'success' ? AUDIT_ACTIONS.SYNC_SUCCESS : AUDIT_ACTIONS.SYNC_ERROR;
  return auditLogger.log(action, {
    status,
    ...details,
  });
}

export function logAuth(action, userId) {
  return auditLogger.log(action, { userId });
}
