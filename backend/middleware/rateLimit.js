/**
 * Lightweight in-memory sliding-window rate limiter middleware.
 * Uses req.ip (respecting Express 'trust proxy' setting).
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 5,
  message = 'Too many requests, please try again later.'
} = {}) => {
  const hits = new Map();

  // Periodically prune expired entries to prevent unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter((ts) => now - ts < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((ts) => now - ts < windowMs);

    if (recent.length >= max) {
      const retryAfterSeconds = Math.ceil((recent[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
      return res.status(429).json({
        success: false,
        message
      });
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
};

module.exports = {
  createRateLimiter
};
