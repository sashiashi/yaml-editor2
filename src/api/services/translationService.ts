import { containsJapanese, isEnglishOnly, formatEnglishTag, sanitizeInput, validateInput } from '../utils/textUtils';
import { makeTranslationRequest } from './translationRequest';
import { withRetry } from '../utils/retry';

interface TranslationErrorDetails extends Error {
  code?: number;
  details?: unknown;
}

export async function translateText(text: string): Promise<string> {
  try {
    if (!validateInput(text)) {
      return text;
    }

    const sanitizedText = sanitizeInput(text);
    const isJapaneseSource = containsJapanese(sanitizedText);
    const sourceLang = isJapaneseSource ? 'JA' : 'EN';
    const targetLang = isJapaneseSource ? 'EN' : 'JA';

    if ((isJapaneseSource && isEnglishOnly(sanitizedText)) || 
        (!isJapaneseSource && containsJapanese(sanitizedText))) {
      return text;
    }

    const translatedText = await withRetry(() => 
      makeTranslationRequest({
        text: sanitizedText,
        sourceLang,
        targetLang
      })
    );

    return isJapaneseSource ? formatEnglishTag(translatedText) : translatedText;

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Translation error details:', {
        input: text,
        error: {
          name: error.name,
          message: error.message,
          code: (error as TranslationErrorDetails).code,
          details: (error as TranslationErrorDetails).details
        }
      });
    }
    throw error;
  }
}