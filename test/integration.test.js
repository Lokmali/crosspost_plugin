/**
 * Integration Tests for Crosspost Plugin
 * Tests the complete workflow and integration between components
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { CrosspostPlugin } from '../index.js';

describe('Crosspost Plugin Integration Tests', () => {
  let plugin;

  before(async () => {
    // Set up plugin for integration tests
    plugin = new CrosspostPlugin({
      enableAnalytics: true,
      autoOptimizeContent: true,
      maxRetries: 2,
      timeout: 10000
    });
  });

  after(async () => {
    // Clean up after tests
    if (plugin) {
      await plugin.destroy();
    }
  });

  describe('Plugin Lifecycle', () => {
    test('should initialize all components successfully', async () => {
      const result = await plugin.initialize();
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(plugin.isInitialized, true);
      assert.ok(plugin.client);
      assert.ok(plugin.auth);
      assert.ok(plugin.optimizer);
      assert.ok(plugin.analytics);
    });

    test('should get plugin information', () => {
      const info = plugin.getInfo();
      
      assert.strictEqual(info.name, 'crosspost-plugin');
      assert.strictEqual(info.version, '1.0.0');
      assert.ok(Array.isArray(info.supportedPlatforms));
      assert.ok(info.supportedPlatforms.length >= 5);
      assert.strictEqual(info.isInitialized, true);
    });
  });

  describe('Authentication Flow', () => {
    test('should handle Twitter authentication flow', async () => {
      const credentials = {
        clientId: 'test-twitter-client-id',
        clientSecret: 'test-twitter-client-secret',
        redirectUri: 'http://localhost:3000/callback'
      };

      // First call should return auth URL
      const authResult = await plugin.authenticate('twitter', credentials);
      
      assert.strictEqual(authResult.success, false);
      assert.ok(authResult.authUrl);
      assert.ok(authResult.state);
      assert.ok(authResult.message.includes('Visit the auth URL'));
    });

    test('should handle LinkedIn authentication flow', async () => {
      const credentials = {
        clientId: 'test-linkedin-client-id',
        clientSecret: 'test-linkedin-client-secret',
        redirectUri: 'http://localhost:3000/callback'
      };

      const authResult = await plugin.authenticate('linkedin', credentials);
      
      assert.strictEqual(authResult.success, false);
      assert.ok(authResult.authUrl);
      assert.ok(authResult.state);
    });

    test('should complete authentication with authorization code', async () => {
      const credentials = {
        clientId: 'test-twitter-client-id',
        clientSecret: 'test-twitter-client-secret',
        redirectUri: 'http://localhost:3000/callback',
        code: 'mock-authorization-code'
      };

      const authResult = await plugin.authenticate('twitter', credentials);
      
      assert.strictEqual(authResult.success, true);
      assert.ok(authResult.accessToken);
      assert.strictEqual(authResult.platform, 'twitter');
    });

    test('should check authentication status', async () => {
      const status = await plugin.getAuthStatus(['twitter', 'linkedin', 'facebook']);
      
      assert.ok(typeof status === 'object');
      assert.ok('twitter' in status);
      assert.ok('linkedin' in status);
      assert.ok('facebook' in status);
      
      // Twitter should be authenticated from previous test
      assert.strictEqual(status.twitter.authenticated, true);
      assert.strictEqual(status.linkedin.authenticated, false);
      assert.strictEqual(status.facebook.authenticated, false);
    });
  });

  describe('Content Optimization Integration', () => {
    test('should optimize content for multiple platforms', async () => {
      const content = {
        text: 'This is a comprehensive test of the crosspost plugin functionality with a longer message that might need optimization for different platforms based on their character limits and requirements.',
        hashtags: ['test', 'crosspost', 'integration', 'socialmedia', 'automation'],
        media: [{
          url: 'https://example.com/test-image.jpg',
          alt: 'Test image for integration testing'
        }]
      };

      const platforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
      const optimized = await plugin.optimizer.optimizeForPlatforms(content, platforms);

      // Check that all platforms have optimized content
      platforms.forEach(platform => {
        assert.ok(platform in optimized);
        assert.ok(optimized[platform].text);
        assert.strictEqual(optimized[platform].platform, platform);
      });

      // Twitter should have truncated text
      assert.ok(optimized.twitter.text.length <= 280);
      
      // LinkedIn should have professional formatting
      assert.ok(optimized.linkedin.text.includes('#'));
      
      // Instagram should require media
      assert.ok(optimized.instagram.media.length > 0);
    });

    test('should validate content for platform requirements', () => {
      const validContent = {
        text: 'Valid content for testing',
        hashtags: ['test'],
        media: [{ url: 'image.jpg', alt: 'Test image' }]
      };

      const invalidContent = {
        text: 'x'.repeat(300), // Too long for Twitter
        hashtags: ['test']
      };

      // Valid content should pass
      const validResult = plugin.optimizer.validateContent(validContent, 'twitter');
      assert.strictEqual(validResult.valid, true);
      assert.strictEqual(validResult.errors.length, 0);

      // Invalid content should fail
      const invalidResult = plugin.optimizer.validateContent(invalidContent, 'twitter');
      assert.strictEqual(invalidResult.valid, false);
      assert.ok(invalidResult.errors.length > 0);
    });

    test('should provide platform recommendations', () => {
      const platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'mastodon'];
      
      platforms.forEach(platform => {
        const recommendations = plugin.optimizer.getPlatformRecommendations(platform);
        assert.ok(Array.isArray(recommendations));
        assert.ok(recommendations.length > 0);
        assert.ok(typeof recommendations[0] === 'string');
      });
    });
  });

  describe('Analytics Integration', () => {
    test('should record and retrieve analytics data', async () => {
      // Record some mock post data
      const mockPostData = {
        content: {
          text: 'Integration test post',
          media: [{ url: 'test.jpg' }],
          hashtags: ['integration', 'test']
        },
        platforms: ['twitter', 'linkedin'],
        successful: [
          {
            platform: 'twitter',
            data: {
              postId: 'tw-integration-test',
              url: 'https://twitter.com/test'
            }
          }
        ],
        failed: [
          {
            platform: 'linkedin',
            error: new Error('Rate limit exceeded')
          }
        ],
        timestamp: new Date().toISOString()
      };

      const postId = await plugin.analytics.recordPost(mockPostData);
      assert.ok(postId);
      assert.ok(postId.startsWith('post_'));

      // Get analytics
      const analytics = await plugin.getAnalytics('7d');
      
      assert.ok(analytics.timeRange);
      assert.ok(analytics.summary);
      assert.ok(analytics.platformBreakdown);
      assert.ok(analytics.contentAnalysis);
      assert.ok(analytics.trends);
      assert.ok(Array.isArray(analytics.recommendations));

      // Check summary metrics
      assert.ok(analytics.summary.totalPosts >= 1);
      assert.ok(analytics.summary.totalPlatformPosts >= 2);
      assert.ok(analytics.summary.successfulPosts >= 1);
      assert.ok(analytics.summary.failedPosts >= 1);
    });

    test('should export analytics data', async () => {
      const jsonExport = await plugin.analytics.exportAnalytics('json', '7d');
      assert.ok(typeof jsonExport === 'string');
      
      const parsedJson = JSON.parse(jsonExport);
      assert.ok(parsedJson.summary);
      assert.ok(parsedJson.platformBreakdown);

      const csvExport = await plugin.analytics.exportAnalytics('csv', '7d');
      assert.ok(typeof csvExport === 'string');
      assert.ok(csvExport.includes(','));
      assert.ok(csvExport.includes('\n'));
    });
  });

  describe('Event Hooks Integration', () => {
    test('should trigger hooks during posting workflow', async () => {
      const hookEvents = [];
      
      // Register hooks
      plugin.on('before-post', (data) => {
        hookEvents.push('before-post');
        assert.ok(data.content);
        assert.ok(data.platforms);
      });

      plugin.on('after-post', (data) => {
        hookEvents.push('after-post');
        assert.ok(data.successfulPosts !== undefined);
        assert.ok(data.failedPosts !== undefined);
      });

      plugin.on('content-transform', (data) => {
        hookEvents.push('content-transform');
        data.content.text += ' [TRANSFORMED]';
      });

      // Simulate posting workflow by emitting events
      const testContent = {
        text: 'Hook integration test',
        hashtags: ['hooks', 'test']
      };

      await plugin.emit('content-transform', { content: testContent });
      await plugin.emit('before-post', { 
        content: testContent, 
        platforms: ['twitter'] 
      });
      await plugin.emit('after-post', { 
        successfulPosts: [], 
        failedPosts: [] 
      });

      // Verify hooks were called
      assert.ok(hookEvents.includes('content-transform'));
      assert.ok(hookEvents.includes('before-post'));
      assert.ok(hookEvents.includes('after-post'));
      
      // Verify content transformation
      assert.ok(testContent.text.includes('[TRANSFORMED]'));
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle unsupported platform gracefully', async () => {
      try {
        await plugin.post(
          { text: 'Test post' },
          ['unsupported-platform']
        );
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('unsupported-platform'));
      }
    });

    test('should handle authentication errors', async () => {
      try {
        await plugin.authenticate('invalid-platform', {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Unsupported platform'));
      }
    });

    test('should handle missing credentials', async () => {
      try {
        await plugin.authenticate('twitter', {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('client ID and secret required'));
      }
    });
  });

  describe('Scheduling Integration', () => {
    test('should schedule posts successfully', async () => {
      const content = {
        text: 'Scheduled integration test post',
        hashtags: ['scheduled', 'test']
      };

      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
      const platforms = ['twitter', 'linkedin'];

      const result = await plugin.schedulePost(
        content,
        platforms,
        scheduledTime,
        { timezone: 'UTC', priority: 'normal' }
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.scheduleId);
      assert.strictEqual(result.scheduledTime, scheduledTime);
      assert.deepStrictEqual(result.platforms, platforms);
      assert.deepStrictEqual(result.content, content);
    });
  });

  describe('Complete Workflow Integration', () => {
    test('should handle complete posting workflow (mock)', async () => {
      // This test simulates the complete workflow without actually posting
      const content = {
        text: 'Complete workflow integration test with comprehensive content that tests all aspects of the crosspost plugin functionality including optimization, validation, and analytics.',
        hashtags: ['workflow', 'integration', 'test', 'complete'],
        media: [{
          url: 'https://example.com/workflow-test.jpg',
          alt: 'Workflow integration test image'
        }]
      };

      const platforms = ['twitter', 'linkedin'];

      // 1. Validate content
      platforms.forEach(platform => {
        const validation = plugin.optimizer.validateContent(content, platform);
        if (!validation.valid) {
          console.log(`Validation warnings for ${platform}:`, validation.errors);
        }
      });

      // 2. Optimize content
      const optimized = await plugin.optimizer.optimizeForPlatforms(content, platforms);
      assert.ok(optimized.twitter);
      assert.ok(optimized.linkedin);

      // 3. Check authentication status
      const authStatus = await plugin.getAuthStatus(platforms);
      assert.ok(authStatus.twitter);
      assert.ok(authStatus.linkedin);

      // 4. Simulate posting (would normally call plugin.post())
      const mockResult = {
        success: true,
        successful: platforms.map(platform => ({
          platform,
          data: {
            postId: `mock-${platform}-${Date.now()}`,
            url: `https://${platform}.com/mock-post`
          }
        })),
        failed: [],
        summary: {
          total: platforms.length,
          successful: platforms.length,
          failed: 0
        }
      };

      // 5. Record analytics
      await plugin.analytics.recordPost({
        content,
        platforms,
        successful: mockResult.successful,
        failed: mockResult.failed,
        timestamp: new Date().toISOString()
      });

      // 6. Get updated analytics
      const analytics = await plugin.getAnalytics('1d');
      assert.ok(analytics.summary.totalPosts > 0);

      console.log('✅ Complete workflow integration test passed');
    });
  });
});

describe('Performance and Reliability', () => {
  test('should handle multiple concurrent operations', async () => {
    const plugin = new CrosspostPlugin({ enableAnalytics: true });
    await plugin.initialize();

    try {
      // Simulate concurrent operations
      const operations = [
        plugin.getAuthStatus(['twitter', 'linkedin']),
        plugin.optimizer.optimizeForPlatforms(
          { text: 'Concurrent test 1', hashtags: ['test'] },
          ['twitter']
        ),
        plugin.optimizer.optimizeForPlatforms(
          { text: 'Concurrent test 2', hashtags: ['test'] },
          ['linkedin']
        ),
        plugin.getAnalytics('1d')
      ];

      const results = await Promise.all(operations);
      
      // All operations should complete successfully
      assert.strictEqual(results.length, 4);
      assert.ok(results[0]); // Auth status
      assert.ok(results[1].twitter); // Optimized content 1
      assert.ok(results[2].linkedin); // Optimized content 2
      assert.ok(results[3].summary); // Analytics
      
    } finally {
      await plugin.destroy();
    }
  });

  test('should handle plugin lifecycle correctly', async () => {
    const plugin = new CrosspostPlugin();
    
    // Should not be initialized initially
    assert.strictEqual(plugin.isInitialized, false);
    
    // Initialize
    await plugin.initialize();
    assert.strictEqual(plugin.isInitialized, true);
    
    // Should be able to use functionality
    const info = plugin.getInfo();
    assert.ok(info.name);
    
    // Destroy
    await plugin.destroy();
    assert.strictEqual(plugin.isInitialized, false);
  });
});