export const TRANSLATION_CONFIG = {
  API_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  ENDPOINTS: {
    TRANSLATE: '/api/translate'
  },
  DEFAULT_OPTIONS: {
    formality: 'default',
    preserve_formatting: true,
    split_sentences: '0'
  }
} as const;