export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface DeepLRequest {
  text: string[];
  source_lang: string;
  target_lang: string;
  formality: string;
  preserve_formatting: boolean;
  split_sentences: string;
}

export interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  backoffFactor: number;
}