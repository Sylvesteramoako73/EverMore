/**
 * The current time for request-time rendering. Server components call this after `connection()`
 * (or inside a cache scope), so each render reads the clock exactly once.
 */
export function currentTime() {
  return Date.now();
}
