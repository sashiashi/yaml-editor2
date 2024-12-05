export const API_CONFIG = {
  ENDPOINTS: {
    TRANSLATE: '/api/translate'
  },
  TIMEOUTS: {
    REQUEST: 30000,    // 30 seconds
    RETRY_BASE: 2000,  // 2 seconds
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_FACTOR: 2
  },
  DEFAULTS: {
    formality: 'default',
    preserve_formatting: true,
    split_sentences: '0'
  }
} as const;