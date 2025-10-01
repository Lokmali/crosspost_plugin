/**
 * Test Suite for Crosspost Plugin
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CrosspostPlugin, createCrosspostPlugin } from '../index.js';

describe('Crosspost Plugin', () => {
  let plugin;

  test('should create plugin instance', () => {
    plugin = new CrosspostPlugin();
    assert.ok(plugin instanceof CrosspostPlugin);
    assert.strictEqual(plugin.isInitialized, false);
  });

  test('should create plugin with factory function', () => {
    const factoryPlugin = createCrosspostPlugin();
    assert.ok(factoryPlugin instanceof CrosspostPlugin);
  });

  test('should initialize plugin successfully', async () => {
    plugin = new CrosspostPlugin({
      enableAnalytics: false // Disable for testing
    });
    
    const result = await plugin.initialize();
    assert.strictEqual(result.success, true);
    assert.strictEqual(plugin.isInitialized, true);
  });

  test('should get plugin info', () => {
    plugin = new CrosspostPlugin();
    const info = plugin.getInfo();
    
    assert.strictEqual(info.name, 'crosspost-plugin');
    assert.strictEqual(info.version, '1.0.0');
    assert.ok(Array.isArray(info.supportedPlatforms));
    assert.ok(info.supportedPlatforms.length > 0);
  });

  test('should register and emit hooks', async () => {
    plugin = new CrosspostPlugin();
    let hookCalled = false;
    
    plugin.on('test-event', (data) => {
      hookCalled = true;
      assert.strictEqual(data.test, true);
    });
    
    await plugin.emit('test-event', { test: true });
    assert.strictEqual(hookCalled, true);
  });

  test('should fail to post without initialization', async () => {
    plugin = new CrosspostPlugin();
    
    try {
      await plugin.post('Test content', ['twitter']);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.ok(error.message.includes('not initialized'));
    }
  });

  test('should handle authentication status check', async () => {
    plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    const status = await plugin.getAuthStatus(['twitter', 'linkedin']);
    assert.ok(typeof status === 'object');
    assert.ok('twitter' in status);
    assert.ok('linkedin' in status);
  });

  test('should schedule posts', async () => {
    plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
    const result = await plugin.schedulePost(
      'Scheduled content',
      ['twitter'],
      scheduledTime
    );
    
    assert.strictEqual(result.success, true);
    assert.ok(result.scheduleId);
    assert.strictEqual(result.scheduledTime, scheduledTime);
  });

  test('should cleanup resources on destroy', async () => {
    plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    assert.strictEqual(plugin.isInitialized, true);
    
    await plugin.destroy();
    assert.strictEqual(plugin.isInitialized, false);
  });
});

describe('Crosspost Client', () => {
  test('should handle unsupported platform', async () => {
    const plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    try {
      await plugin.post('Test content', ['unsupported-platform']);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.ok(error.message.includes('unsupported-platform'));
    }
  });
});

describe('Content Optimizer', () => {
  test('should optimize content for multiple platforms', async () => {
    const plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    const content = {
      text: 'This is a test post with some content that might need optimization for different platforms',
      hashtags: ['test', 'crosspost', 'socialmedia']
    };
    
    const optimized = await plugin.optimizer.optimizeForPlatforms(
      content,
      ['twitter', 'linkedin']
    );
    
    assert.ok('twitter' in optimized);
    assert.ok('linkedin' in optimized);
    assert.ok(optimized.twitter.text);
    assert.ok(optimized.linkedin.text);
  });

  test('should validate content for platform limits', () => {
    const plugin = new CrosspostPlugin();
    
    const longContent = {
      text: 'x'.repeat(300) // Exceeds Twitter limit
    };
    
    const validation = plugin.optimizer.validateContent(longContent, 'twitter');
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.length > 0);
  });

  test('should get platform recommendations', () => {
    const plugin = new CrosspostPlugin();
    
    const recommendations = plugin.optimizer.getPlatformRecommendations('twitter');
    assert.ok(Array.isArray(recommendations));
    assert.ok(recommendations.length > 0);
  });
});

describe('Authentication Manager', () => {
  test('should generate authorization URL', async () => {
    const plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    const result = await plugin.authenticate('twitter', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback'
    });
    
    assert.strictEqual(result.success, false); // No code provided
    assert.ok(result.authUrl);
    assert.ok(result.state);
  });

  test('should check authentication status', async () => {
    const plugin = new CrosspostPlugin();
    await plugin.initialize();
    
    const status = await plugin.getAuthStatus(['twitter']);
    assert.ok('twitter' in status);
    assert.strictEqual(typeof status.twitter.authenticated, 'boolean');
  });
});

describe('Analytics Collector', () => {
  test('should record post analytics', async () => {
    const plugin = new CrosspostPlugin({
      enableAnalytics: true
    });
    await plugin.initialize();
    
    const postData = {
      content: {
        text: 'Test post',
        media: [],
        hashtags: ['test']
      },
      platforms: ['twitter'],
      successful: [{
        platform: 'twitter',
        data: {
          postId: 'test-post-id',
          url: 'https://twitter.com/test'
        }
      }],
      failed: []
    };
    
    const postId = await plugin.analytics.recordPost(postData);
    assert.ok(postId);
    assert.ok(postId.startsWith('post_'));
  });

  test('should get analytics data', async () => {
    const plugin = new CrosspostPlugin({
      enableAnalytics: true
    });
    await plugin.initialize();
    
    const analytics = await plugin.getAnalytics('7d');
    assert.ok(analytics.timeRange);
    assert.ok(analytics.summary);
    assert.ok(analytics.platformBreakdown);
    assert.ok(analytics.contentAnalysis);
  });

  test('should export analytics data', async () => {
    const plugin = new CrosspostPlugin({
      enableAnalytics: true
    });
    await plugin.initialize();
    
    const jsonExport = await plugin.analytics.exportAnalytics('json', '7d');
    assert.ok(typeof jsonExport === 'string');
    
    const csvExport = await plugin.analytics.exportAnalytics('csv', '7d');
    assert.ok(typeof csvExport === 'string');
    assert.ok(csvExport.includes(','));
  });
});
