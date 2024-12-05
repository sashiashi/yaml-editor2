import { TranslationError } from '../errors/TranslationError';

export const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const handleApiError = (status: number): string => {
  switch (status) {
    case 400:
      return '無効なリクエストです。入力テキストを確認してください。';
    case 401:
    case 403:
      return 'APIキーが無効です。環境変数を確認してください。';
    case 404:
      return 'APIエンドポイントが見つかりません。';
    case 413:
      return 'テキストが長すぎます。短く分割してください。';
    case 429:
      return 'リクエスト制限に達しました。しばらく待ってから再試行してください。';
    case 456:
      return 'クォータ制限に達しました。';
    case 500:
    case 503:
      return 'サービスが一時的に利用できません。';
    default:
      return `APIエラー (${status})`;
  }
};

export async function makeRequest(
  url: string, 
  options: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      signal,
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      cache: 'no-cache'
    });

    if (response.status === 403) {
      throw new TranslationError('APIキーが無効か、アクセス権限がありません。', 403);
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TranslationError('リクエストがタイムアウトしました。', 408);
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new TranslationError('ネットワークエラーが発生しました。インターネット接続を確認してください。', 0);
    }
    throw error;
  }
}