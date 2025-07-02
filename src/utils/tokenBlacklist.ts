/**
 * Token Blacklist Utility
 * Manages blacklisted tokens for the Innovation Hub platform
 * 
 * Last updated: 2025-07-01 15:35:36 UTC
 * Updated by: Alain275
 */

// Token blacklist entry with expiration time
interface BlacklistEntry {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// In-memory storage for blacklisted tokens
const blacklistStore: Map<string, BlacklistEntry> = new Map();

// Cleanup interval in milliseconds (every 1 hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000;

/**
 * Add a token to the blacklist
 * @param token JWT token to blacklist
 * @param expiresIn Time in seconds until the token expires (defaults to 24 hours)
 */
export const addToBlacklist = (token: string, expiresIn: number = 86400): void => {
  if (!token) {
    console.warn(`[${new Date().toISOString()}] Attempted to blacklist an empty token`);
    return;
  }
  
  const expiresAt = Date.now() + (expiresIn * 1000);
  
  blacklistStore.set(token, { token, expiresAt });
  
  console.log(`[${new Date().toISOString()}] Token added to blacklist by ${process.env.NODE_ENV === 'development' ? 'Alain275' : 'system'}`);
};

/**
 * Check if a token is blacklisted
 * @param token JWT token to check
 * @returns Boolean indicating if the token is blacklisted
 */
export const isBlacklisted = (token: string): boolean => {
  if (!token) return false;
  
  const entry = blacklistStore.get(token);
  
  // If token not found, it's not blacklisted
  if (!entry) return false;
  
  // If token is expired, remove it from blacklist and return false
  if (entry.expiresAt < Date.now()) {
    blacklistStore.delete(token);
    return false;
  }
  
  return true;
};

/**
 * Remove a token from the blacklist
 * @param token JWT token to remove from blacklist
 * @returns Boolean indicating if the token was removed
 */
export const removeFromBlacklist = (token: string): boolean => {
  return blacklistStore.delete(token);
};

/**
 * Get the number of tokens in the blacklist
 * @returns Count of blacklisted tokens
 */
export const getBlacklistSize = (): number => {
  return blacklistStore.size;
};

/**
 * Clear all tokens from the blacklist
 */
export const clearBlacklist = (): void => {
  blacklistStore.clear();
  console.log(`[${new Date().toISOString()}] Token blacklist cleared by ${process.env.NODE_ENV === 'development' ? 'Alain275' : 'system'}`);
};

/**
 * Clean up expired tokens from the blacklist
 * @returns Number of tokens removed
 */
export const cleanupExpiredTokens = (): number => {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [token, entry] of blacklistStore.entries()) {
    if (entry.expiresAt < now) {
      blacklistStore.delete(token);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`[${new Date().toISOString()}] Removed ${removedCount} expired tokens from blacklist`);
  }
  
  return removedCount;
};

// Backward compatibility for original interface
const blacklist: Set<string> = new Set();

// Set up automatic cleanup of expired tokens
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);

// Log module initialization
console.log(`[2025-07-01 15:35:36] Token blacklist initialized by Alain275`);