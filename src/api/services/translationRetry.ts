import { TRANSLATION_CONFIG } from '../config/translationConfig';
import { TranslationError } from '../errors/TranslationError';

type TranslationFunction<T, P extends unknown[]> = (...args: P) => Promise<T>;

export async function withRetry<T, P extends unknown[]>(
  fn: TranslationFunction<T, P>,
  ...args: P
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < TRANSLATION_CONFIG.MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = TRANSLATION_CONFIG.BASE_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await fn(...args);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Translation attempt ${attempt + 1} failed:`, error);

      if (error instanceof TranslationError) {
        // Don't retry on client errors (400-level) except rate limiting (429)
        if (error.code && error.code !== 429 && error.code < 500) {
          throw error;
        }
      }

      if (attempt === TRANSLATION_CONFIG.MAX_RETRIES - 1) {
        throw new TranslationError(
          'すべての翻訳試行が失敗しました。後でもう一度お試しください。',
          undefined,
          { originalError: lastError }
        );
      }
    }
  }

  throw new TranslationError(
    'すべての翻訳試行が失敗しました。後でもう一度お試しください。',
    undefined,
    { originalError: lastError }
  );
}