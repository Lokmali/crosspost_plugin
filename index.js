/**
 * Crosspost Plugin - Main Entry Point
 * This plugin replaces the crosspost SDK with enhanced functionality
 */

import { pluginConfig } from './plugin.config.js';
import { CrosspostClient } from './src/crosspost-client.js';
import { AuthManager } from './src/auth-manager.js';
import { ContentOptimizer } from './src/content-optimizer.js';
import { AnalyticsCollector } from './src/analytics-collector.js';

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
    
    this.hooks = new Map();
    this.isInitialized = false;
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
          return await this.client.postToPlatform(platform, platformContent, options);
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
    // This would integrate with a scheduling service
    return {
      success: true,
      scheduleId: `schedule_${Date.now()}`,
      scheduledTime,
      platforms,
      content
    };
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
   * Cleanup resources
   */
  async destroy() {
    await this.client.destroy();
    await this.auth.destroy();
    if (this.analytics) {
      await this.analytics.destroy();
    }
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
