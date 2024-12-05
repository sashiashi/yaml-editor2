import { TRANSLATION_CONFIG } from '../config/translationConfig';
import { TranslationError } from '../errors/TranslationError';

type RetryableFunction<T> = () => Promise<T>;

export async function withRetry<T>(fn: RetryableFunction<T>): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < TRANSLATION_CONFIG.MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = TRANSLATION_CONFIG.BASE_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Translation attempt ${attempt + 1} failed:`, {
        message: lastError.message
      });

      if (error instanceof TranslationError) {
        if (error.code && error.code !== 429 && error.code < 500) {
          throw error;
        }
      }

      if (attempt === TRANSLATION_CONFIG.MAX_RETRIES - 1) {
        break;
      }
    }
  }

  throw new TranslationError(
    'すべての翻訳試行が失敗しました。後でもう一度お試しください。',
    undefined,
    { originalError: lastError }
  );
}