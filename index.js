/**
 * Crosspost Plugin - Main Entry Point
 * This plugin replaces the crosspost SDK with enhanced functionality
 */

import { pluginConfig } from './plugin.config.js';
import { CrosspostClient } from './src/crosspost-client.js';
import { AuthManager } from './src/auth-manager.js';
import { ContentOptimizer } from './src/content-optimizer.js';
import { AnalyticsCollector } from './src/analytics-collector.js';
import { PostScheduler } from './src/scheduler.js';
import { WebhookHandler } from './src/webhook-handler.js';

/**
 * Main Plugin Class
 */
export class CrosspostPlugin {
  constructor(config = {}) {
    this.config = { ...pluginConfig.defaultSettings, ...config };
    this.client = new CrosspostClient(this.config);
    this.auth = new AuthManager(this.config);
    this.optimizer = new ContentOptimizer(this.config);
    this.analytics = new AnalyticsCollector(this.config);
    this.scheduler = new PostScheduler({
      ...this.config,
      onExecutePost: this.executeScheduledPost.bind(this)
    });
    this.webhookHandler = new WebhookHandler(this.config);
    
    this.hooks = new Map();
    this.isInitialized = false;
    this.setupWebhookHandlers();
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    try {
      await this.auth.initialize();
      await this.client.initialize();
      
      if (this.config.enableAnalytics) {
        await this.analytics.initialize();
      }

      if (this.config.enableScheduling !== false) {
        await this.scheduler.initialize();
      }
      
      this.isInitialized = true;
      this.emit('plugin-initialized');
      
      return { success: true, message: 'Crosspost plugin initialized successfully' };
    } catch (error) {
      throw new Error(`Failed to initialize crosspost plugin: ${error.message}`);
    }
  }

  /**
   * Post content to multiple platforms
   */
  async post(content, platforms = [], options = {}) {
    if (!this.isInitialized) {
      throw new Error('Plugin not initialized. Call initialize() first.');
    }

    try {
      // Emit before-post hook
      await this.emit('before-post', { content, platforms, options });

      // Optimize content for each platform
      const optimizedContent = await this.optimizer.optimizeForPlatforms(content, platforms);

      // Post to each platform
      const results = await Promise.allSettled(
        platforms.map(async (platform) => {
          const platformContent = optimizedContent[platform] || content;
          
          // Get fresh access token
          const accessToken = await this.auth.getAccessToken(platform);
          if (!accessToken) {
            throw new Error(`No access token available for ${platform}. Please authenticate first.`);
          }
          
          const platformOptions = {
            ...options,
            accessToken
          };
          
          return await this.client.postToPlatform(platform, platformContent, platformOptions);
        })
      );

      // Process results
      const successfulPosts = [];
      const failedPosts = [];

      results.forEach((result, index) => {
        const platform = platforms[index];
        if (result.status === 'fulfilled') {
          successfulPosts.push({ platform, data: result.value });
        } else {
          failedPosts.push({ platform, error: result.reason });
        }
      });

      // Collect analytics
      if (this.config.enableAnalytics) {
        await this.analytics.recordPost({
          content,
          platforms,
          successful: successfulPosts,
          failed: failedPosts,
          timestamp: new Date().toISOString()
        });
      }

      // Emit after-post hook
      await this.emit('after-post', { successfulPosts, failedPosts });

      return {
        success: failedPosts.length === 0,
        successful: successfulPosts,
        failed: failedPosts,
        summary: {
          total: platforms.length,
          successful: successfulPosts.length,
          failed: failedPosts.length
        }
      };

    } catch (error) {
      await this.emit('on-error', { error, content, platforms });
      throw error;
    }
  }

  /**
   * Authenticate with a platform
   */
  async authenticate(platform, credentials) {
    return await this.auth.authenticate(platform, credentials);
  }

  /**
   * Get authentication status for platforms
   */
  async getAuthStatus(platforms = []) {
    return await this.auth.getAuthStatus(platforms);
  }

  /**
   * Schedule a post for later
   */
  async schedulePost(content, platforms, scheduledTime, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Plugin not initialized. Call initialize() first.');
    }

    try {
      // Validate scheduled time
      const scheduleDate = new Date(scheduledTime);
      if (scheduleDate <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      // Validate platforms
      for (const platform of platforms) {
        const isAuthenticated = this.auth.isAuthenticated(platform);
        if (!isAuthenticated) {
          console.warn(`Platform ${platform} is not authenticated. Post may fail when scheduled.`);
        }
      }

      // Emit before-schedule hook
      await this.emit('before-schedule', { content, platforms, scheduledTime, options });

      // Schedule the post
      const result = await this.scheduler.schedulePost(content, platforms, scheduledTime, options);

      // Emit after-schedule hook
      await this.emit('after-schedule', result);

      return result;
    } catch (error) {
      await this.emit('on-error', { error, content, platforms, scheduledTime });
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(timeRange = '7d') {
    if (!this.config.enableAnalytics) {
      throw new Error('Analytics not enabled');
    }
    return await this.analytics.getAnalytics(timeRange);
  }

  /**
   * Register a hook
   */
  on(event, callback) {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event).push(callback);
  }

  /**
   * Emit an event to all registered hooks
   */
  async emit(event, data) {
    const callbacks = this.hooks.get(event) || [];
    await Promise.all(callbacks.map(callback => callback(data)));
  }

  /**
   * Get plugin information
   */
  getInfo() {
    return {
      name: pluginConfig.name,
      version: pluginConfig.version,
      description: pluginConfig.description,
      supportedPlatforms: pluginConfig.supportedPlatforms,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Execute scheduled post (called by scheduler)
   */
  async executeScheduledPost(content, platforms, options = {}) {
    try {
      console.log('Executing scheduled post for platforms:', platforms);
      const result = await this.post(content, platforms, options);
      return result;
    } catch (error) {
      console.error('Failed to execute scheduled post:', error);
      throw error;
    }
  }

  /**
   * Set up webhook handlers
   */
  setupWebhookHandlers() {
    // Set up default webhook event handlers
    this.webhookHandler.on('twitter:tweet_create_events', (data) => {
      this.emit('webhook:twitter:tweet_created', data);
    });

    this.webhookHandler.on('facebook:feed', (data) => {
      this.emit('webhook:facebook:feed', data);
    });

    this.webhookHandler.on('instagram:comments', (data) => {
      this.emit('webhook:instagram:comment', data);
    });

    this.webhookHandler.on('linkedin:share', (data) => {
      this.emit('webhook:linkedin:share', data);
    });
  }

  /**
   * Get webhook handler for Express.js integration
   */
  getWebhookMiddleware() {
    return this.webhookHandler.createExpressMiddleware();
  }

  /**
   * Get webhook URL for platform
   */
  getWebhookUrl(platform, baseUrl) {
    return this.webhookHandler.getWebhookUrl(platform, baseUrl);
  }

  /**
   * Get scheduled posts
   */
  getScheduledPosts(status = null) {
    return this.scheduler.getScheduledPosts(status);
  }

  /**
   * Cancel scheduled post
   */
  async cancelScheduledPost(scheduleId) {
    return await this.scheduler.cancelScheduledPost(scheduleId);
  }

  /**
   * Update scheduled post
   */
  async updateScheduledPost(scheduleId, updates) {
    return await this.scheduler.updateScheduledPost(scheduleId, updates);
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus() {
    return await this.client.rateLimiter.getStatus();
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    return {
      plugin: {
        isInitialized: this.isInitialized,
        version: this.getInfo().version
      },
      scheduler: this.scheduler.getStats(),
      webhooks: this.webhookHandler.getStats(),
      authentication: {
        authenticatedPlatforms: Array.from(this.auth.tokens.keys()),
        tokenCount: this.auth.tokens.size
      }
    };
  }

  /**
   * Refresh access token for platform
   */
  async refreshToken(platform) {
    return await this.auth.refreshAccessToken(platform);
  }

  /**
   * Revoke authentication for platform
   */
  async revokeAuth(platform) {
    await this.auth.revokeAuth(platform);
    this.emit('auth-revoked', { platform });
  }

  /**
   * Validate content for platforms
   */
  validateContent(content, platforms) {
    const results = {};
    
    for (const platform of platforms) {
      results[platform] = this.optimizer.validateContent(content, platform);
    }
    
    return results;
  }

  /**
   * Get platform recommendations
   */
  getPlatformRecommendations(platform) {
    return this.optimizer.getPlatformRecommendations(platform);
  }

  /**
   * Clean up old scheduled posts
   */
  async cleanupOldPosts(olderThanDays = 30) {
    return await this.scheduler.cleanupOldPosts(olderThanDays);
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format = 'json', timeRange = '30d') {
    if (!this.config.enableAnalytics) {
      throw new Error('Analytics not enabled');
    }
    return await this.analytics.exportAnalytics(format, timeRange);
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    await this.client.destroy();
    await this.auth.destroy();
    if (this.analytics) {
      await this.analytics.destroy();
    }
    if (this.scheduler) {
      await this.scheduler.destroy();
    }
    this.webhookHandler.removeAllListeners();
    this.hooks.clear();
    this.isInitialized = false;
  }
}

/**
 * Factory function to create plugin instance
 */
export function createCrosspostPlugin(config = {}) {
  return new CrosspostPlugin(config);
}

/**
 * Plugin metadata for registration
 */
export const metadata = pluginConfig;

/**
 * Default export
 */
export default CrosspostPlugin;
