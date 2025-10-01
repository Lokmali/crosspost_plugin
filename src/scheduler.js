/**
 * Post Scheduler
 * Handles scheduling and queuing of posts
 */

import fs from 'fs/promises';
import path from 'path';

export class PostScheduler {
  constructor(config) {
    this.config = config;
    this.scheduledPosts = new Map();
    this.timers = new Map();
    this.isRunning = false;
    this.storageDir = config.storageDir || '.crosspost-scheduler';
    this.checkInterval = config.schedulerCheckInterval || 60000; // 1 minute
    this.intervalId = null;
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    await this.loadScheduledPosts();
    await this.startScheduler();
    this.isRunning = true;
  }

  /**
   * Schedule a post
   */
  async schedulePost(content, platforms, scheduledTime, options = {}) {
    const scheduleId = this.generateScheduleId();
    const scheduledPost = {
      id: scheduleId,
      content,
      platforms,
      scheduledTime: new Date(scheduledTime),
      options,
      status: 'scheduled',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3
    };

    this.scheduledPosts.set(scheduleId, scheduledPost);
    await this.saveScheduledPosts();

    // Set up timer if the post is scheduled for the near future
    const timeUntilPost = scheduledPost.scheduledTime.getTime() - Date.now();
    if (timeUntilPost <= 24 * 60 * 60 * 1000) { // Within 24 hours
      this.setTimer(scheduleId, timeUntilPost);
    }

    return {
      success: true,
      scheduleId,
      scheduledTime: scheduledPost.scheduledTime,
      platforms,
      content
    };
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(scheduleId) {
    const scheduledPost = this.scheduledPosts.get(scheduleId);
    if (!scheduledPost) {
      throw new Error(`Scheduled post not found: ${scheduleId}`);
    }

    if (scheduledPost.status !== 'scheduled') {
      throw new Error(`Cannot cancel post with status: ${scheduledPost.status}`);
    }

    // Clear timer if exists
    if (this.timers.has(scheduleId)) {
      clearTimeout(this.timers.get(scheduleId));
      this.timers.delete(scheduleId);
    }

    // Update status
    scheduledPost.status = 'cancelled';
    scheduledPost.cancelledAt = new Date();

    await this.saveScheduledPosts();

    return {
      success: true,
      scheduleId,
      status: 'cancelled'
    };
  }

  /**
   * Get scheduled posts
   */
  getScheduledPosts(status = null) {
    const posts = Array.from(this.scheduledPosts.values());
    
    if (status) {
      return posts.filter(post => post.status === status);
    }
    
    return posts;
  }

  /**
   * Get scheduled post by ID
   */
  getScheduledPost(scheduleId) {
    return this.scheduledPosts.get(scheduleId);
  }

  /**
   * Update scheduled post
   */
  async updateScheduledPost(scheduleId, updates) {
    const scheduledPost = this.scheduledPosts.get(scheduleId);
    if (!scheduledPost) {
      throw new Error(`Scheduled post not found: ${scheduleId}`);
    }

    // Update allowed fields
    const allowedUpdates = ['content', 'platforms', 'scheduledTime', 'options'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'scheduledTime') {
          scheduledPost[key] = new Date(value);
          
          // Update timer if needed
          if (this.timers.has(scheduleId)) {
            clearTimeout(this.timers.get(scheduleId));
            this.timers.delete(scheduleId);
          }
          
          const timeUntilPost = scheduledPost.scheduledTime.getTime() - Date.now();
          if (timeUntilPost > 0 && timeUntilPost <= 24 * 60 * 60 * 1000) {
            this.setTimer(scheduleId, timeUntilPost);
          }
        } else {
          scheduledPost[key] = value;
        }
      }
    }

    scheduledPost.updatedAt = new Date();
    await this.saveScheduledPosts();

    return scheduledPost;
  }

  /**
   * Start the scheduler
   */
  async startScheduler() {
    if (this.intervalId) {
      return; // Already running
    }

    // Check for posts to execute immediately
    await this.checkScheduledPosts();

    // Set up interval to check for scheduled posts
    this.intervalId = setInterval(async () => {
      try {
        await this.checkScheduledPosts();
      } catch (error) {
        console.error('Error checking scheduled posts:', error);
      }
    }, this.checkInterval);

    console.log('Post scheduler started');
  }

  /**
   * Stop the scheduler
   */
  async stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    this.isRunning = false;
    console.log('Post scheduler stopped');
  }

  /**
   * Check for posts that need to be executed
   */
  async checkScheduledPosts() {
    const now = Date.now();
    const postsToExecute = [];

    for (const [scheduleId, post] of this.scheduledPosts.entries()) {
      if (post.status === 'scheduled' && post.scheduledTime.getTime() <= now) {
        postsToExecute.push({ scheduleId, post });
      }
    }

    for (const { scheduleId, post } of postsToExecute) {
      try {
        await this.executeScheduledPost(scheduleId, post);
      } catch (error) {
        console.error(`Failed to execute scheduled post ${scheduleId}:`, error);
        await this.handlePostExecutionError(scheduleId, post, error);
      }
    }
  }

  /**
   * Execute a scheduled post
   */
  async executeScheduledPost(scheduleId, post) {
    console.log(`Executing scheduled post: ${scheduleId}`);
    
    post.status = 'executing';
    post.attempts++;
    post.lastAttemptAt = new Date();

    try {
      // This would call the main crosspost functionality
      // For now, we'll emit an event that the main plugin can listen to
      if (this.config.onExecutePost) {
        const result = await this.config.onExecutePost(post.content, post.platforms, post.options);
        
        post.status = 'completed';
        post.completedAt = new Date();
        post.result = result;
        
        console.log(`Scheduled post ${scheduleId} executed successfully`);
      } else {
        throw new Error('No post execution handler configured');
      }
    } catch (error) {
      throw error;
    } finally {
      await this.saveScheduledPosts();
    }
  }

  /**
   * Handle post execution error
   */
  async handlePostExecutionError(scheduleId, post, error) {
    console.error(`Post execution failed for ${scheduleId}:`, error.message);

    if (post.attempts >= post.maxAttempts) {
      post.status = 'failed';
      post.failedAt = new Date();
      post.error = error.message;
      console.log(`Scheduled post ${scheduleId} failed after ${post.attempts} attempts`);
    } else {
      // Retry later
      post.status = 'scheduled';
      const retryDelay = Math.min(300000, 60000 * Math.pow(2, post.attempts - 1)); // Max 5 minutes
      post.scheduledTime = new Date(Date.now() + retryDelay);
      
      console.log(`Retrying scheduled post ${scheduleId} in ${retryDelay / 1000} seconds (attempt ${post.attempts + 1}/${post.maxAttempts})`);
    }

    await this.saveScheduledPosts();
  }

  /**
   * Set timer for a scheduled post
   */
  setTimer(scheduleId, delay) {
    const timer = setTimeout(async () => {
      try {
        const post = this.scheduledPosts.get(scheduleId);
        if (post && post.status === 'scheduled') {
          await this.executeScheduledPost(scheduleId, post);
        }
      } catch (error) {
        const post = this.scheduledPosts.get(scheduleId);
        await this.handlePostExecutionError(scheduleId, post, error);
      } finally {
        this.timers.delete(scheduleId);
      }
    }, delay);

    this.timers.set(scheduleId, timer);
  }

  /**
   * Generate unique schedule ID
   */
  generateScheduleId() {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load scheduled posts from storage
   */
  async loadScheduledPosts() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      
      const scheduledPostsFile = path.join(this.storageDir, 'scheduled-posts.json');
      const data = await fs.readFile(scheduledPostsFile, 'utf8');
      const posts = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const post of posts) {
        post.scheduledTime = new Date(post.scheduledTime);
        post.createdAt = new Date(post.createdAt);
        if (post.updatedAt) post.updatedAt = new Date(post.updatedAt);
        if (post.completedAt) post.completedAt = new Date(post.completedAt);
        if (post.failedAt) post.failedAt = new Date(post.failedAt);
        if (post.cancelledAt) post.cancelledAt = new Date(post.cancelledAt);
        if (post.lastAttemptAt) post.lastAttemptAt = new Date(post.lastAttemptAt);
        
        this.scheduledPosts.set(post.id, post);
      }
      
      console.log(`Loaded ${posts.length} scheduled posts`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Failed to load scheduled posts:', error.message);
      }
      this.scheduledPosts = new Map();
    }
  }

  /**
   * Save scheduled posts to storage
   */
  async saveScheduledPosts() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      
      const scheduledPostsFile = path.join(this.storageDir, 'scheduled-posts.json');
      const posts = Array.from(this.scheduledPosts.values());
      
      await fs.writeFile(scheduledPostsFile, JSON.stringify(posts, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save scheduled posts:', error.message);
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const posts = Array.from(this.scheduledPosts.values());
    
    return {
      total: posts.length,
      scheduled: posts.filter(p => p.status === 'scheduled').length,
      executing: posts.filter(p => p.status === 'executing').length,
      completed: posts.filter(p => p.status === 'completed').length,
      failed: posts.filter(p => p.status === 'failed').length,
      cancelled: posts.filter(p => p.status === 'cancelled').length,
      activeTimers: this.timers.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Clean up old posts
   */
  async cleanupOldPosts(olderThanDays = 30) {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [scheduleId, post] of this.scheduledPosts.entries()) {
      const shouldCleanup = 
        (post.status === 'completed' && post.completedAt < cutoffDate) ||
        (post.status === 'failed' && post.failedAt < cutoffDate) ||
        (post.status === 'cancelled' && post.cancelledAt < cutoffDate);

      if (shouldCleanup) {
        this.scheduledPosts.delete(scheduleId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.saveScheduledPosts();
      console.log(`Cleaned up ${cleanedCount} old scheduled posts`);
    }

    return cleanedCount;
  }

  /**
   * Destroy scheduler
   */
  async destroy() {
    await this.stopScheduler();
    await this.saveScheduledPosts();
  }
}


