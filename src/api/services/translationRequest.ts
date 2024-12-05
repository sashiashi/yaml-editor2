import { TranslationRequest } from '../types/translation';

export async function makeTranslationRequest(request: TranslationRequest): Promise<string> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: [request.text],
      source_lang: request.sourceLang,
      target_lang: request.targetLang
    })
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}