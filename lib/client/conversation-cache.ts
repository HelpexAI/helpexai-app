"use client";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: unknown; expiresAt: number }>();

export const conversationCacheKeys = {
  list: "conversations:list",
  detail: (id: string) => `conversations:${id}`,
};

export function getConversationCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setConversationCache<T>(key: string, value: T) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function updateConversationCache<T>(key: string, update: (value: T) => T) {
  const current = getConversationCache<T>(key);
  if (current) setConversationCache(key, update(current));
}

export function invalidateConversationCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
