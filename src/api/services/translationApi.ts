import { TranslationError } from '../errors/TranslationError';
import { API_CONFIG } from '../config/constants';
import { TranslationRequest, DeepLRequest, DeepLResponse } from '../types/translation';

export async function makeTranslationRequest(request: TranslationRequest): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUTS.REQUEST);

  try {
    const requestBody: DeepLRequest = {
      text: [request.text],
      source_lang: request.sourceLang,
      target_lang: request.targetLang,
      ...API_CONFIG.DEFAULTS
    };

    const response = await fetch(API_CONFIG.ENDPOINTS.TRANSLATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new TranslationError(
        `Translation API error: ${response.status}`,
        response.status,
        { response: await response.text() }
      );
    }

    const data: DeepLResponse = await response.json();
    const translation = data?.translations?.[0]?.text?.trim();

    if (!translation) {
      throw new TranslationError('無効な翻訳結果です。');
    }

    return translation;

  } catch (error: unknown) {
    if (error instanceof TranslationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TranslationError('リクエストがタイムアウトしました。');
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new TranslationError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    throw new TranslationError('予期せぬエラーが発生しました。', undefined, { originalError: error });
  } finally {
    clearTimeout(timeoutId);
  }
}