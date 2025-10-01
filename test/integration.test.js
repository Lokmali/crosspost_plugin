/**
 * Integration Tests for Crosspost Plugin
 * Tests the full workflow of posting to multiple platforms
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CrosspostPlugin } from '../index.js';

describe('Integration Tests', () => {
  let plugin;

  test('should complete full posting workflow', async () => {
    plugin = new CrosspostPlugin({
      enableAnalytics: true,
      autoOptimizeContent: true
    });

    // Initialize plugin
    await plugin.initialize();
    assert.strictEqual(plugin.isInitialized, true);

    // Mock authentication (in real scenario, would use actual OAuth)
    plugin.auth.tokens.set('twitter', 'mock-twitter-token');
    plugin.auth.tokens.set('linkedin', 'mock-linkedin-token');

    // Prepare content
    const content = {
      text: 'This is a test crosspost to multiple social media platforms! 🚀',
      hashtags: ['crosspost', 'socialmedia', 'automation'],
      media: [{
        url: 'https://example.com/image.jpg',
        alt: 'Test image'
      }]
    };

    const platforms = ['twitter', 'linkedin'];

    // Mock the actual posting to avoid real API calls
    const originalPostToPlatform = plugin.client.postToPlatform;
    plugin.client.postToPlatform = async (platform, content, options) => {
      // Simulate successful posting
      return {
        platform,
        postId: `mock-${platform}-${Date.now()}`,
        url: `https://${platform}.com/post/mock-${Date.now()}`,
        response: { success: true }
      };
    };

    try {
      // Perform the crosspost
      const result = await plugin.post(content, platforms);

      // Verify results
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.successful.length, 2);
      assert.strictEqual(result.failed.length, 0);
      assert.strictEqual(result.summary.total, 2);
      assert.strictEqual(result.summary.successful, 2);
      assert.strictEqual(result.summary.failed, 0);

      // Verify platform-specific results
      const twitterResult = result.successful.find(r => r.platform === 'twitter');
      const linkedinResult = result.successful.find(r => r.platform === 'linkedin');
      
      assert.ok(twitterResult);
      assert.ok(linkedinResult);
      assert.ok(twitterResult.data.postId);
      assert.ok(linkedinResult.data.postId);

    } finally {
      // Restore original method
      plugin.client.postToPlatform = originalPostToPlatform;
    }
  });

  test('should handle partial failures gracefully', async () => {
    plugin = new CrosspostPlugin({
      enableAnalytics: true
    });

    await plugin.initialize();

    // Mock authentication
    plugin.auth.tokens.set('twitter', 'mock-twitter-token');
    plugin.auth.tokens.set('facebook', 'mock-facebook-token');

    const content = {
      text: 'Test post with partial failure scenario'
    };

    const platforms = ['twitter', 'facebook'];

    // Mock posting with one success and one failure
    plugin.client.postToPlatform = async (platform, content, options) => {
      if (platform === 'twitter') {
        return {
          platform,
          postId: `mock-twitter-${Date.now()}`,
          url: `https://twitter.com/post/mock-${Date.now()}`,
          response: { success: true }
        };
      } else {
        throw new Error('Facebook API rate limit exceeded');
      }
    };

    const result = await plugin.post(content, platforms);

    // Verify partial success
    assert.strictEqual(result.success, false); // Overall failure due to partial failure
    assert.strictEqual(result.successful.length, 1);
    assert.strictEqual(result.failed.length, 1);
    assert.strictEqual(result.summary.total, 2);
    assert.strictEqual(result.summary.successful, 1);
    assert.strictEqual(result.summary.failed, 1);

    // Verify specific results
    const successfulPost = result.successful[0];
    const failedPost = result.failed[0];

    assert.strictEqual(successfulPost.platform, 'twitter');
    assert.strictEqual(failedPost.platform, 'facebook');
    assert.ok(failedPost.error.includes('rate limit'));
  });

  test('should optimize content differently for each platform', async () => {
    plugin = new CrosspostPlugin({
      autoOptimizeContent: true
    });

    await plugin.initialize();

    const longContent = {
      text: 'This is a very long piece of content that exceeds the character limits of some social media platforms like Twitter, but should work fine on platforms like LinkedIn and Facebook which have much higher character limits for posts.',
      hashtags: ['test', 'longcontent', 'optimization', 'crosspost', 'socialmedia']
    };

    const platforms = ['twitter', 'linkedin', 'instagram'];

    // Mock authentication
    platforms.forEach(platform => {
      plugin.auth.tokens.set(platform, `mock-${platform}-token`);
    });

    // Mock media for Instagram
    longContent.media = [{
      url: 'https://example.com/test-image.jpg',
      alt: 'Test image for Instagram'
    }];

    // Mock successful posting
    plugin.client.postToPlatform = async (platform, optimizedContent, options) => {
      // Verify content was optimized for each platform
      if (platform === 'twitter') {
        assert.ok(optimizedContent.text.length <= 280);
      } else if (platform === 'linkedin') {
        assert.ok(optimizedContent.text.length <= 3000);
        assert.strictEqual(optimizedContent.platform, 'linkedin');
      } else if (platform === 'instagram') {
        assert.ok(optimizedContent.media && optimizedContent.media.length > 0);
        assert.strictEqual(optimizedContent.platform, 'instagram');
      }

      return {
        platform,
        postId: `mock-${platform}-${Date.now()}`,
        url: `https://${platform}.com/post/mock-${Date.now()}`,
        response: { success: true }
      };
    };

    const result = await plugin.post(longContent, platforms);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.successful.length, 3);
    assert.strictEqual(result.failed.length, 0);
  });

  test('should collect and analyze posting analytics', async () => {
    plugin = new CrosspostPlugin({
      enableAnalytics: true
    });

    await plugin.initialize();

    // Simulate multiple posts over time
    const posts = [
      {
        content: { text: 'Post 1', media: [], hashtags: ['test'] },
        platforms: ['twitter', 'linkedin'],
        successful: [
          { platform: 'twitter', data: { postId: 'tw1', url: 'https://twitter.com/1' } },
          { platform: 'linkedin', data: { postId: 'li1', url: 'https://linkedin.com/1' } }
        ],
        failed: []
      },
      {
        content: { text: 'Post 2', media: [{ url: 'image.jpg' }], hashtags: ['test', 'media'] },
        platforms: ['twitter', 'facebook'],
        successful: [
          { platform: 'twitter', data: { postId: 'tw2', url: 'https://twitter.com/2' } }
        ],
        failed: [
          { platform: 'facebook', error: new Error('Auth failed') }
        ]
      }
    ];

    // Record posts
    const postIds = [];
    for (const post of posts) {
      const postId = await plugin.analytics.recordPost(post);
      postIds.push(postId);
    }

    // Get analytics
    const analytics = await plugin.getAnalytics('7d');

    // Verify analytics structure
    assert.ok(analytics.summary);
    assert.ok(analytics.platformBreakdown);
    assert.ok(analytics.contentAnalysis);
    assert.ok(analytics.trends);
    assert.ok(analytics.recommendations);

    // Verify summary metrics
    assert.strictEqual(analytics.summary.totalPosts, 2);
    assert.strictEqual(analytics.summary.totalPlatformPosts, 4);
    assert.strictEqual(analytics.summary.successfulPosts, 3);
    assert.strictEqual(analytics.summary.failedPosts, 1);

    // Verify platform breakdown
    assert.ok(analytics.platformBreakdown.twitter);
    assert.ok(analytics.platformBreakdown.linkedin);
    assert.ok(analytics.platformBreakdown.facebook);

    assert.strictEqual(analytics.platformBreakdown.twitter.successful, 2);
    assert.strictEqual(analytics.platformBreakdown.facebook.failed, 1);

    // Verify content analysis
    assert.ok(analytics.contentAnalysis.mediaUsage);
    assert.strictEqual(analytics.contentAnalysis.mediaUsage.withMedia, 1);
    assert.strictEqual(analytics.contentAnalysis.mediaUsage.withoutMedia, 1);

    // Verify recommendations
    assert.ok(Array.isArray(analytics.recommendations));
  });

  test('should handle authentication workflow', async () => {
    plugin = new CrosspostPlugin();
    await plugin.initialize();

    // Test getting auth URL
    const authResult = await plugin.authenticate('twitter', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback'
    });

    assert.strictEqual(authResult.success, false); // No code provided
    assert.ok(authResult.authUrl);
    assert.ok(authResult.authUrl.includes('twitter.com'));
    assert.ok(authResult.state);

    // Test completing auth with code
    const completeAuthResult = await plugin.authenticate('twitter', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      code: 'mock-auth-code'
    });

    assert.strictEqual(completeAuthResult.success, true);
    assert.ok(completeAuthResult.accessToken);
    assert.strictEqual(completeAuthResult.platform, 'twitter');

    // Verify token was stored
    const authStatus = await plugin.getAuthStatus(['twitter']);
    assert.strictEqual(authStatus.twitter.authenticated, true);
  });

  test('should handle plugin lifecycle correctly', async () => {
    plugin = new CrosspostPlugin({
      enableAnalytics: true
    });

    // Test initial state
    assert.strictEqual(plugin.isInitialized, false);

    // Test initialization
    await plugin.initialize();
    assert.strictEqual(plugin.isInitialized, true);

    // Test that all components are initialized
    assert.strictEqual(plugin.client.isInitialized, true);
    assert.strictEqual(plugin.auth.isInitialized, true);
    assert.strictEqual(plugin.analytics.isInitialized, true);

    // Test cleanup
    await plugin.destroy();
    assert.strictEqual(plugin.isInitialized, false);
    assert.strictEqual(plugin.client.isInitialized, false);
    assert.strictEqual(plugin.auth.isInitialized, false);
    assert.strictEqual(plugin.analytics.isInitialized, false);
  });
});
