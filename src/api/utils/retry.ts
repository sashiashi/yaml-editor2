import { API_CONFIG } from '../config/constants';
import { TranslationError } from '../errors/TranslationError';

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < API_CONFIG.RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        const delay = API_CONFIG.TIMEOUTS.RETRY_BASE * Math.pow(API_CONFIG.RETRY.BACKOFF_FACTOR, attempt - 1);
        await sleep(delay);
        console.log(`Retrying translation (attempt ${attempt + 1}/${API_CONFIG.RETRY.MAX_ATTEMPTS})...`);
      }

      return await operation();

    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Translation attempt ${attempt + 1} failed:`, {
        error: lastError.message
      });

      if (error instanceof TranslationError) {
        // Don't retry on client errors (400-level) except rate limiting (429)
        if (error.code && error.code !== 429 && error.code < 500) {
          throw error;
        }
      }

      if (attempt === API_CONFIG.RETRY.MAX_ATTEMPTS - 1) {
        throw new TranslationError(
          'すべての翻訳試行が失敗しました。後でもう一度お試しください。',
          undefined,
          { originalError: lastError }
        );
      }
    }
  }

  throw lastError;
}