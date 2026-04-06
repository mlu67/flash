import pino from 'pino';

const logger = pino({
  // Map pino levels to GCP Cloud Logging severity
  formatters: {
    level(label) {
      const severityMap = {
        trace: 'DEBUG',
        debug: 'DEBUG',
        info: 'INFO',
        warn: 'WARNING',
        error: 'ERROR',
        fatal: 'CRITICAL',
      };
      return { severity: severityMap[label] || 'DEFAULT' };
    },
  },
  // Use 'message' key for GCP compatibility
  messageKey: 'message',
});

export default logger;
