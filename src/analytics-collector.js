/**
 * Analytics Collector
 * Collects and analyzes posting metrics across platforms
 */

export class AnalyticsCollector {
  constructor(config) {
    this.config = config;
    this.metrics = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    // Initialize analytics storage
    await this.loadStoredMetrics();
    this.isInitialized = true;
  }

  /**
   * Record a post event
   */
  async recordPost(postData) {
    if (!this.isInitialized) {
      throw new Error('AnalyticsCollector not initialized');
    }

    const postId = this.generatePostId();
    const record = {
      id: postId,
      timestamp: postData.timestamp || new Date().toISOString(),
      content: {
        textLength: postData.content.text?.length || 0,
        mediaCount: postData.content.media?.length || 0,
        hashtagCount: postData.content.hashtags?.length || 0
      },
      platforms: postData.platforms,
      successful: postData.successful.map(s => ({
        platform: s.platform,
        postId: s.data.postId,
        url: s.data.url
      })),
      failed: postData.failed.map(f => ({
        platform: f.platform,
        error: f.error.message
      })),
      metrics: {
        totalPlatforms: postData.platforms.length,
        successfulPlatforms: postData.successful.length,
        failedPlatforms: postData.failed.length,
        successRate: (postData.successful.length / postData.platforms.length) * 100
      }
    };

    // Store the record
    this.metrics.set(postId, record);
    await this.saveMetrics();

    // Update aggregated metrics
    await this.updateAggregatedMetrics(record);

    return postId;
  }

  /**
   * Get analytics for a time range
   */
  async getAnalytics(timeRange = '7d') {
    if (!this.isInitialized) {
      throw new Error('AnalyticsCollector not initialized');
    }

    const endDate = new Date();
    const startDate = this.getStartDate(timeRange, endDate);

    // Filter records by time range
    const records = Array.from(this.metrics.values()).filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });

    return {
      timeRange,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: this.calculateSummaryMetrics(records),
      platformBreakdown: this.calculatePlatformMetrics(records),
      contentAnalysis: this.analyzeContent(records),
      trends: this.calculateTrends(records),
      recommendations: this.generateRecommendations(records)
    };
  }

  /**
   * Calculate summary metrics
   */
  calculateSummaryMetrics(records) {
    const totalPosts = records.length;
    const totalPlatformPosts = records.reduce((sum, record) => 
      sum + record.metrics.totalPlatforms, 0);
    const successfulPosts = records.reduce((sum, record) => 
      sum + record.metrics.successfulPlatforms, 0);
    const failedPosts = records.reduce((sum, record) => 
      sum + record.metrics.failedPlatforms, 0);

    return {
      totalPosts,
      totalPlatformPosts,
      successfulPosts,
      failedPosts,
      overallSuccessRate: totalPlatformPosts > 0 ? 
        (successfulPosts / totalPlatformPosts) * 100 : 0,
      averagePlatformsPerPost: totalPosts > 0 ? 
        totalPlatformPosts / totalPosts : 0
    };
  }

  /**
   * Calculate platform-specific metrics
   */
  calculatePlatformMetrics(records) {
    const platformStats = {};

    records.forEach(record => {
      // Count successful posts per platform
      record.successful.forEach(success => {
        if (!platformStats[success.platform]) {
          platformStats[success.platform] = {
            totalAttempts: 0,
            successful: 0,
            failed: 0,
            successRate: 0
          };
        }
        platformStats[success.platform].totalAttempts++;
        platformStats[success.platform].successful++;
      });

      // Count failed posts per platform
      record.failed.forEach(failure => {
        if (!platformStats[failure.platform]) {
          platformStats[failure.platform] = {
            totalAttempts: 0,
            successful: 0,
            failed: 0,
            successRate: 0
          };
        }
        platformStats[failure.platform].totalAttempts++;
        platformStats[failure.platform].failed++;
      });
    });

    // Calculate success rates
    Object.keys(platformStats).forEach(platform => {
      const stats = platformStats[platform];
      stats.successRate = stats.totalAttempts > 0 ? 
        (stats.successful / stats.totalAttempts) * 100 : 0;
    });

    return platformStats;
  }

  /**
   * Analyze content patterns
   */
  analyzeContent(records) {
    const contentStats = {
      textLength: {
        average: 0,
        min: Infinity,
        max: 0,
        distribution: {}
      },
      mediaUsage: {
        withMedia: 0,
        withoutMedia: 0,
        averageMediaCount: 0
      },
      hashtagUsage: {
        withHashtags: 0,
        withoutHashtags: 0,
        averageHashtagCount: 0
      }
    };

    let totalTextLength = 0;
    let totalMediaCount = 0;
    let totalHashtagCount = 0;

    records.forEach(record => {
      const content = record.content;
      
      // Text length analysis
      totalTextLength += content.textLength;
      contentStats.textLength.min = Math.min(contentStats.textLength.min, content.textLength);
      contentStats.textLength.max = Math.max(contentStats.textLength.max, content.textLength);

      // Media analysis
      totalMediaCount += content.mediaCount;
      if (content.mediaCount > 0) {
        contentStats.mediaUsage.withMedia++;
      } else {
        contentStats.mediaUsage.withoutMedia++;
      }

      // Hashtag analysis
      totalHashtagCount += content.hashtagCount;
      if (content.hashtagCount > 0) {
        contentStats.hashtagUsage.withHashtags++;
      } else {
        contentStats.hashtagUsage.withoutHashtags++;
      }
    });

    // Calculate averages
    const recordCount = records.length;
    if (recordCount > 0) {
      contentStats.textLength.average = totalTextLength / recordCount;
      contentStats.mediaUsage.averageMediaCount = totalMediaCount / recordCount;
      contentStats.hashtagUsage.averageHashtagCount = totalHashtagCount / recordCount;
    }

    if (contentStats.textLength.min === Infinity) {
      contentStats.textLength.min = 0;
    }

    return contentStats;
  }

  /**
   * Calculate trends over time
   */
  calculateTrends(records) {
    // Group records by day
    const dailyStats = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          posts: 0,
          successful: 0,
          failed: 0,
          successRate: 0
        };
      }
      
      dailyStats[date].posts++;
      dailyStats[date].successful += record.metrics.successfulPlatforms;
      dailyStats[date].failed += record.metrics.failedPlatforms;
    });

    // Calculate daily success rates
    Object.keys(dailyStats).forEach(date => {
      const stats = dailyStats[date];
      const total = stats.successful + stats.failed;
      stats.successRate = total > 0 ? (stats.successful / total) * 100 : 0;
    });

    return {
      daily: dailyStats,
      trend: this.calculateTrendDirection(dailyStats)
    };
  }

  /**
   * Generate recommendations based on analytics
   */
  generateRecommendations(records) {
    const recommendations = [];
    const platformMetrics = this.calculatePlatformMetrics(records);
    const contentAnalysis = this.analyzeContent(records);

    // Platform success rate recommendations
    Object.entries(platformMetrics).forEach(([platform, stats]) => {
      if (stats.successRate < 80) {
        recommendations.push({
          type: 'platform_reliability',
          priority: 'high',
          message: `${platform} has a low success rate (${stats.successRate.toFixed(1)}%). Check authentication and API limits.`
        });
      }
    });

    // Content optimization recommendations
    if (contentAnalysis.mediaUsage.withMedia > 0 && contentAnalysis.mediaUsage.withoutMedia > 0) {
      const mediaSuccessRate = this.calculateMediaSuccessRate(records);
      if (mediaSuccessRate.withMedia > mediaSuccessRate.withoutMedia) {
        recommendations.push({
          type: 'content_optimization',
          priority: 'medium',
          message: 'Posts with media have higher success rates. Consider adding images or videos to your posts.'
        });
      }
    }

    // Hashtag recommendations
    if (contentAnalysis.hashtagUsage.averageHashtagCount < 2) {
      recommendations.push({
        type: 'content_optimization',
        priority: 'low',
        message: 'Consider using more hashtags to increase discoverability.'
      });
    }

    return recommendations;
  }

  /**
   * Calculate media success rate comparison
   */
  calculateMediaSuccessRate(records) {
    const withMedia = { total: 0, successful: 0 };
    const withoutMedia = { total: 0, successful: 0 };

    records.forEach(record => {
      if (record.content.mediaCount > 0) {
        withMedia.total += record.metrics.totalPlatforms;
        withMedia.successful += record.metrics.successfulPlatforms;
      } else {
        withoutMedia.total += record.metrics.totalPlatforms;
        withoutMedia.successful += record.metrics.successfulPlatforms;
      }
    });

    return {
      withMedia: withMedia.total > 0 ? (withMedia.successful / withMedia.total) * 100 : 0,
      withoutMedia: withoutMedia.total > 0 ? (withoutMedia.successful / withoutMedia.total) * 100 : 0
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrendDirection(dailyStats) {
    const dates = Object.keys(dailyStats).sort();
    if (dates.length < 2) return 'insufficient_data';

    const firstHalf = dates.slice(0, Math.floor(dates.length / 2));
    const secondHalf = dates.slice(Math.floor(dates.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, date) => 
      sum + dailyStats[date].successRate, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, date) => 
      sum + dailyStats[date].successRate, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;
    
    if (Math.abs(difference) < 5) return 'stable';
    return difference > 0 ? 'improving' : 'declining';
  }

  /**
   * Get start date for time range
   */
  getStartDate(timeRange, endDate) {
    const ranges = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = ranges[timeRange] || 7;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    return startDate;
  }

  /**
   * Generate unique post ID
   */
  generatePostId() {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update aggregated metrics
   */
  async updateAggregatedMetrics(record) {
    // This would update running totals, averages, etc.
    // Implementation depends on storage backend
  }

  /**
   * Load stored metrics
   */
  async loadStoredMetrics() {
    // Mock implementation - in real app, load from database
    // this.metrics = new Map();
  }

  /**
   * Save metrics to storage
   */
  async saveMetrics() {
    // Mock implementation - in real app, save to database
    // In production, this would batch writes and use proper storage
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format = 'json', timeRange = '30d') {
    const analytics = await this.getAnalytics(timeRange);
    
    switch (format) {
      case 'json':
        return JSON.stringify(analytics, null, 2);
      case 'csv':
        return this.convertToCSV(analytics);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert analytics to CSV format
   */
  convertToCSV(analytics) {
    // Simplified CSV conversion
    const headers = ['Date', 'Platform', 'Posts', 'Successful', 'Failed', 'Success Rate'];
    const rows = [headers.join(',')];

    Object.entries(analytics.platformBreakdown).forEach(([platform, stats]) => {
      rows.push([
        new Date().toISOString().split('T')[0],
        platform,
        stats.totalAttempts,
        stats.successful,
        stats.failed,
        stats.successRate.toFixed(2)
      ].join(','));
    });

    return rows.join('\n');
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    await this.saveMetrics();
    this.metrics.clear();
    this.isInitialized = false;
  }
}
