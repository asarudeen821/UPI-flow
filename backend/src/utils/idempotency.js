// In-memory idempotency store (replace with Redis in production)
const store = new Map();

/**
 * Check if a request key has already been processed.
 * Returns cached result if found, otherwise stores the result after fn() resolves.
 */
export async function withIdempotency(key, fn) {
  if (store.has(key)) {
    return { ...store.get(key), idempotent: true };
  }
  const result = await fn();
  store.set(key, result);
  // Auto-expire after 24 hours
  const timer = setTimeout(() => store.delete(key), 86_400_000);
  timer.unref?.();
  return result;
}

export default withIdempotency;
