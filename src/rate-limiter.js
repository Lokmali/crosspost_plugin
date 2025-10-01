/**
 * Rate Limiter
 * Manages API rate limits for different platforms
 */

export class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.requests = new Map();
    
    // Platform rate limits (requests per window)
    this.platformLimits = {
      twitter: {
        posts: { limit: 300, window: 15 * 60 * 1000 }, // 300 posts per 15 minutes
        uploads: { limit: 300, window: 15 * 60 * 1000 }
      },
      linkedin: {
        posts: { limit: 100, window: 24 * 60 * 60 * 1000 }, // 100 posts per day
        uploads: { limit: 100, window: 24 * 60 * 60 * 1000 }
      },
      facebook: {
        posts: { limit: 200, window: 60 * 60 * 1000 }, // 200 posts per hour
        uploads: { limit: 200, window: 60 * 60 * 1000 }
      },
      instagram: {
        posts: { limit: 200, window: 60 * 60 * 1000 }, // 200 posts per hour
        uploads: { limit: 200, window: 60 * 60 * 1000 }
      },
      mastodon: {
        posts: { limit: 300, window: 5 * 60 * 1000 }, // 300 posts per 5 minutes
        uploads: { limit: 300, window: 5 * 60 * 1000 }
      }
    };
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(platform, operation = 'posts') {
    const key = `${platform}:${operation}`;
    const limit = this.platformLimits[platform]?.[operation];
    
    if (!limit) {
      return { allowed: true, resetTime: null, remaining: null };
    }

    const now = Date.now();
    const windowStart = now - limit.window;
    
    // Get or create request history for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);
    
    // Check if we're within limits
    const allowed = validRequests.length < limit.limit;
    const remaining = Math.max(0, limit.limit - validRequests.length);
    const resetTime = validRequests.length > 0 ? 
      new Date(Math.min(...validRequests) + limit.window) : 
      new Date(now + limit.window);
    
    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? 0 : resetTime.getTime() - now
    };
  }

  /**
   * Record a request
   */
  async recordRequest(platform, operation = 'posts') {
    const key = `${platform}:${operation}`;
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    this.requests.get(key).push(now);
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForReset(platform, operation = 'posts') {
    const status = await this.checkLimit(platform, operation);
    
    if (!status.allowed && status.retryAfter > 0) {
      console.log(`Rate limit exceeded for ${platform}:${operation}. Waiting ${Math.ceil(status.retryAfter / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, status.retryAfter));
    }
  }

  /**
   * Get rate limit status for all platforms
   */
  async getStatus() {
    const status = {};
    
    for (const [platform, operations] of Object.entries(this.platformLimits)) {
      status[platform] = {};
      
      for (const operation of Object.keys(operations)) {
        status[platform][operation] = await this.checkLimit(platform, operation);
      }
    }
    
    return status;
  }

  /**
   * Reset rate limits (for testing)
   */
  reset() {
    this.requests.clear();
  }

  /**
   * Set custom rate limits
   */
  setCustomLimit(platform, operation, limit, window) {
    if (!this.platformLimits[platform]) {
      this.platformLimits[platform] = {};
    }
    
    this.platformLimits[platform][operation] = { limit, window };
  }
}


