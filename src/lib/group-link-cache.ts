/**
 * Group Link Cache
 * Phase 21-02: Campaign Queue Integration
 * 
 * Provides in-memory caching for group invite links during campaign execution.
 * This avoids repeated database lookups for the same segment during a campaign run.
 * 
 * Cache is cleared:
 * - When campaign completes
 * - When campaign is cancelled
 * - On server restart (in-memory only)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CachedGroupLink {
  inviteUrl: string;
  groupId: string;
  chipId: string | null;
  cachedAt: Date;
}

// ─── Cache Storage ─────────────────────────────────────────────────────────────

/**
 * In-memory cache for group links.
 * Key format: `${campaignId}:${segmentTag}`
 * 
 * Note: This is intentionally in-memory (not Redis) because:
 * 1. Campaign execution is typically single-process
 * 2. Cache lifetime is short (minutes during campaign hydration)
 * 3. Simplicity for MVP
 */
const groupLinkCache = new Map<string, CachedGroupLink>();

// Maximum cache age (5 minutes - campaigns shouldn't take longer than this to hydrate)
const MAX_CACHE_AGE_MS = 5 * 60 * 1000;

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 1000;

// ─── Cache Key Generation ──────────────────────────────────────────────────────

function getCacheKey(campaignId: string, segmentTag: string): string {
  return `${campaignId}:${segmentTag}`;
}

// ─── Cache Operations ───────────────────────────────────────────────────────────

/**
 * Get a cached group link for a campaign/segment combination.
 * Returns null if not cached or cache expired.
 */
export function getGroupLink(
  campaignId: string, 
  segmentTag: string
): CachedGroupLink | null {
  const key = getCacheKey(campaignId, segmentTag);
  const cached = groupLinkCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache entry has expired
  const age = Date.now() - cached.cachedAt.getTime();
  if (age > MAX_CACHE_AGE_MS) {
    groupLinkCache.delete(key);
    return null;
  }
  
  return cached;
}

/**
 * Store a group link in the cache.
 * Automatically manages cache size to prevent memory leaks.
 */
export function setGroupLink(
  campaignId: string,
  segmentTag: string,
  data: Omit<CachedGroupLink, 'cachedAt'>
): void {
  const key = getCacheKey(campaignId, segmentTag);
  
  // Trim cache if it's grown too large (LRU-like behavior)
  if (groupLinkCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entries (first 10%)
    const entriesToDelete = Math.floor(MAX_CACHE_SIZE * 0.1);
    let deleted = 0;
    
    for (const [cacheKey] of groupLinkCache) {
      if (deleted >= entriesToDelete) break;
      groupLinkCache.delete(cacheKey);
      deleted++;
    }
  }
  
  groupLinkCache.set(key, {
    ...data,
    cachedAt: new Date(),
  });
}

/**
 * Clear all cached group links for a campaign.
 * Call this when campaign completes or is cancelled.
 */
export function clearCampaignCache(campaignId: string): void {
  // Find and delete all entries for this campaign
  const prefix = `${campaignId}:`;
  
  for (const [key] of groupLinkCache) {
    if (key.startsWith(prefix)) {
      groupLinkCache.delete(key);
    }
  }
}

/**
 * Clear all cached group links.
 * Useful for testing or when significant data changes.
 */
export function clearAllCaches(): void {
  groupLinkCache.clear();
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  maxAgeMs: number;
} {
  return {
    size: groupLinkCache.size,
    maxSize: MAX_CACHE_SIZE,
    maxAgeMs: MAX_CACHE_AGE_MS,
  };
}