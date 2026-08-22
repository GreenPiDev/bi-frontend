import type { ChatHistoryItem } from '../../lib/api';

const STORAGE_KEY_PREFIX = 'pilens-chat-history:';
const MAX_HISTORY = 20;

/**
 * Anahtar kullanici id'sine gore ayrilir - aksi halde ayni sekmede baska bir
 * kullaniciya gecildiginde (ornegin davet kabul akisi, ki bu gercek bir
 * logout cagrisi yapmaz) onceki kullanicinin sohbet gecmisi sizabilir.
 */
function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function loadChatHistory(userId: string): ChatHistoryItem[] {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatHistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(userId: string, history: ChatHistoryItem[]): void {
  sessionStorage.setItem(storageKey(userId), JSON.stringify(history.slice(-MAX_HISTORY)));
}

/** Tum kullanicilarin gecmisini temizler (logout'ta cagrilir - o an hangi kullanicinin oturumu kapandigindan bagimsiz calisir). */
export function clearChatHistory(): void {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}
