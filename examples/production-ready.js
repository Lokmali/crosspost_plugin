/**
 * Production-Ready Example for Crosspost Plugin
 * Demonstrates all advanced features including real API calls, scheduling, webhooks, and more
 */

import { CrosspostPlugin } from '../index.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

async function productionExample() {
  console.log('🚀 Starting Production-Ready Crosspost Plugin Example');

  // Create plugin instance with full configuration
  const crosspost = new CrosspostPlugin({
    // Core settings
    enableAnalytics: true,
    autoOptimizeContent: true,
    maxRetries: 3,
    timeout: 30000,
    
    // Scheduling
    enableScheduling: true,
    schedulerCheckInterval: 30000, // Check every 30 seconds
    
    // Storage
    storageDir: '.crosspost-data',
    encryptionKey: process.env.CROSSPOST_ENCRYPTION_KEY,
    
    // Rate limiting
    retryDelay: 2000,
    
    // Platform configurations
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      webhookSecret: process.env.TWITTER_WEBHOOK_SECRET
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      webhookSecret: process.env.FACEBOOK_WEBHOOK_SECRET,
      verifyToken: process.env.FACEBOOK_VERIFY_TOKEN
    },
    mastodonInstance: process.env.MASTODON_INSTANCE || 'https://mastodon.social'
  });

  try {
    // Set up advanced event handlers
    setupAdvancedEventHandlers(crosspost);

    // Initialize the plugin
    console.log('📦 Initializing plugin with all features...');
    await crosspost.initialize();
    console.log('✅ Plugin initialized successfully');

    // Show plugin statistics
    const stats = crosspost.getStats();
    console.log('📊 Plugin Statistics:', JSON.stringify(stats, null, 2));

    // Demonstrate authentication flow
    await demonstrateAuthentication(crosspost);

    // Demonstrate content validation and optimization
    await demonstrateContentProcessing(crosspost);

    // Demonstrate rate limiting
    await demonstrateRateLimiting(crosspost);

    // Demonstrate scheduling
    await demonstrateAdvancedScheduling(crosspost);

    // Demonstrate real posting (commented out for safety)
    // await demonstrateRealPosting(crosspost);

    // Demonstrate webhook setup
    await demonstrateWebhookSetup(crosspost);

    // Demonstrate analytics and insights
    await demonstrateAdvancedAnalytics(crosspost);

    // Demonstrate error handling and recovery
    await demonstrateErrorHandling(crosspost);

    console.log('✨ Production example completed successfully!');

  } catch (error) {
    console.error('❌ Error in production example:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    await crosspost.destroy();
    console.log('👋 Production example finished');
  }
}

function setupAdvancedEventHandlers(crosspost) {
  console.log('🪝 Setting up advanced event handlers...');

  // Authentication events
  crosspost.on('auth-revoked', (data) => {
    console.log(`🔐 Authentication revoked for ${data.platform}`);
  });

  // Scheduling events
  crosspost.on('before-schedule', (data) => {
    console.log(`📅 About to schedule post for ${data.platforms.join(', ')}`);
  });

  crosspost.on('after-schedule', (data) => {
    console.log(`✅ Post scheduled successfully: ${data.scheduleId}`);
  });

  // Webhook events
  crosspost.on('webhook:twitter:tweet_created', (data) => {
    console.log('🐦 Twitter webhook: Tweet created', data);
  });

  crosspost.on('webhook:facebook:feed', (data) => {
    console.log('📘 Facebook webhook: Feed event', data);
  });

  crosspost.on('webhook:instagram:comment', (data) => {
    console.log('📷 Instagram webhook: Comment received', data);
  });

  // Error handling
  crosspost.on('on-error', (data) => {
    console.error('💥 Plugin error:', data.error.message);
    // In production, you might send this to an error tracking service
  });

  // Success tracking
  crosspost.on('on-success', (data) => {
    console.log(`🎉 Successful post to ${data.platform}`);
  });
}

async function demonstrateAuthentication(crosspost) {
  console.log('\n🔐 Demonstrating Advanced Authentication...');

  const platforms = ['twitter', 'linkedin', 'facebook'];
  
  for (const platform of platforms) {
    try {
      console.log(`\n📱 ${platform.toUpperCase()} Authentication:`);
      
      // Check current auth status
      const authStatus = await crosspost.getAuthStatus([platform]);
      console.log(`  Current status: ${authStatus[platform].authenticated ? 'Authenticated' : 'Not authenticated'}`);
      
      if (!authStatus[platform].authenticated) {
        // Start OAuth flow
        const authResult = await crosspost.authenticate(platform, {
          clientId: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
          clientSecret: process.env[`${platform.toUpperCase()}_CLIENT_SECRET`],
          redirectUri: 'http://localhost:3000/callback'
        });

        if (!authResult.success) {
          console.log(`  🔗 Authorization URL: ${authResult.authUrl}`);
          console.log(`  📝 State: ${authResult.state}`);
          console.log('  💡 Complete authentication in browser, then run with authorization code');
        }
      } else {
        console.log('  ✅ Already authenticated');
        
        // Demonstrate token refresh
        try {
          const newToken = await crosspost.refreshToken(platform);
          console.log('  🔄 Token refreshed successfully');
        } catch (error) {
          console.log(`  ⚠️ Token refresh not available: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Authentication error: ${error.message}`);
    }
  }
}

async function demonstrateContentProcessing(crosspost) {
  console.log('\n🎯 Demonstrating Advanced Content Processing...');

  const content = {
    text: 'This is a comprehensive test of the production-ready crosspost plugin! 🚀 It includes advanced features like real API calls, rate limiting, scheduling, webhooks, and comprehensive analytics. Perfect for enterprise social media management! #crosspost #socialmedia #automation #enterprise #productivity',
    hashtags: ['crosspost', 'socialmedia', 'automation', 'enterprise', 'productivity', 'api', 'scheduling'],
    media: [
      {
        url: 'https://via.placeholder.com/1200x630/0066cc/ffffff?text=Production+Ready+Crosspost+Plugin',
        alt: 'Production-ready crosspost plugin demonstration',
        type: 'image/png'
      }
    ],
    poll: {
      options: ['Excellent', 'Good', 'Needs improvement'],
      duration: 1440 // 24 hours
    }
  };

  const platforms = ['twitter', 'linkedin', 'facebook', 'instagram'];

  // Validate content for all platforms
  console.log('✅ Validating content for all platforms...');
  const validationResults = crosspost.validateContent(content, platforms);
  
  for (const [platform, result] of Object.entries(validationResults)) {
    console.log(`  ${platform.toUpperCase()}: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!result.valid) {
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
  }

  // Optimize content for each platform
  console.log('\n🔧 Optimizing content for each platform...');
  const optimizedContent = await crosspost.optimizer.optimizeForPlatforms(content, platforms);
  
  for (const [platform, optimized] of Object.entries(optimizedContent)) {
    console.log(`  ${platform.toUpperCase()}:`);
    console.log(`    Text length: ${optimized.text.length} chars`);
    console.log(`    Hashtags: ${optimized.hashtags?.length || 0}`);
    console.log(`    Media: ${optimized.media?.length || 0} items`);
    console.log(`    Platform-specific: ${optimized.platform}`);
  }

  // Get platform recommendations
  console.log('\n💡 Platform Recommendations:');
  for (const platform of platforms) {
    const recommendations = crosspost.getPlatformRecommendations(platform);
    console.log(`  ${platform.toUpperCase()}:`);
    recommendations.slice(0, 2).forEach(rec => console.log(`    - ${rec}`));
  }
}

async function demonstrateRateLimiting(crosspost) {
  console.log('\n⏱️ Demonstrating Rate Limiting...');

  // Get current rate limit status
  const rateLimitStatus = await crosspost.getRateLimitStatus();
  console.log('📊 Current Rate Limit Status:');
  
  for (const [platform, operations] of Object.entries(rateLimitStatus)) {
    console.log(`  ${platform.toUpperCase()}:`);
    for (const [operation, status] of Object.entries(operations)) {
      console.log(`    ${operation}: ${status.remaining}/${status.remaining + (status.allowed ? 0 : 1)} remaining`);
      if (status.resetTime) {
        console.log(`      Resets at: ${status.resetTime.toLocaleString()}`);
      }
    }
  }
}

async function demonstrateAdvancedScheduling(crosspost) {
  console.log('\n📅 Demonstrating Advanced Scheduling...');

  const content = {
    text: 'This is a scheduled post from the production-ready crosspost plugin! ⏰',
    hashtags: ['scheduled', 'automation', 'crosspost']
  };

  // Schedule multiple posts
  const schedules = [
    {
      time: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      platforms: ['twitter'],
      content: { ...content, text: content.text + ' (Twitter)' }
    },
    {
      time: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      platforms: ['linkedin'],
      content: { ...content, text: content.text + ' (LinkedIn)' }
    },
    {
      time: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      platforms: ['twitter', 'linkedin'],
      content: { ...content, text: content.text + ' (Multi-platform)' }
    }
  ];

  const scheduledPosts = [];
  for (const schedule of schedules) {
    try {
      const result = await crosspost.schedulePost(
        schedule.content,
        schedule.platforms,
        schedule.time,
        { priority: 'normal', maxAttempts: 3 }
      );
      scheduledPosts.push(result);
      console.log(`✅ Scheduled post ${result.scheduleId} for ${schedule.platforms.join(', ')} at ${schedule.time.toLocaleString()}`);
    } catch (error) {
      console.error(`❌ Failed to schedule post: ${error.message}`);
    }
  }

  // Show scheduled posts
  const allScheduled = crosspost.getScheduledPosts('scheduled');
  console.log(`\n📋 Total scheduled posts: ${allScheduled.length}`);

  // Demonstrate updating a scheduled post
  if (scheduledPosts.length > 0) {
    const firstScheduled = scheduledPosts[0];
    try {
      const updated = await crosspost.updateScheduledPost(firstScheduled.scheduleId, {
        content: {
          ...firstScheduled.content,
          text: firstScheduled.content.text + ' (UPDATED)'
        }
      });
      console.log(`✅ Updated scheduled post ${firstScheduled.scheduleId}`);
    } catch (error) {
      console.error(`❌ Failed to update scheduled post: ${error.message}`);
    }
  }

  // Demonstrate canceling a scheduled post
  if (scheduledPosts.length > 1) {
    try {
      const cancelled = await crosspost.cancelScheduledPost(scheduledPosts[1].scheduleId);
      console.log(`✅ Cancelled scheduled post ${scheduledPosts[1].scheduleId}`);
    } catch (error) {
      console.error(`❌ Failed to cancel scheduled post: ${error.message}`);
    }
  }
}

async function demonstrateWebhookSetup(crosspost) {
  console.log('\n🔗 Demonstrating Webhook Setup...');

  // Get webhook middleware for Express.js
  const webhookMiddleware = crosspost.getWebhookMiddleware();
  
  // Create Express app for webhook handling
  const app = express();
  app.use(express.json());

  // Set up webhook endpoints
  app.post('/webhooks/twitter', webhookMiddleware.twitter);
  app.post('/webhooks/facebook', webhookMiddleware.facebook);
  app.post('/webhooks/linkedin', webhookMiddleware.linkedin);

  // Get webhook URLs
  const baseUrl = 'https://your-domain.com';
  const platforms = ['twitter', 'facebook', 'linkedin'];
  
  console.log('🔗 Webhook URLs for platform configuration:');
  for (const platform of platforms) {
    try {
      const webhookUrl = crosspost.getWebhookUrl(platform, baseUrl);
      console.log(`  ${platform.toUpperCase()}: ${webhookUrl}`);
    } catch (error) {
      console.log(`  ${platform.toUpperCase()}: Not supported`);
    }
  }

  console.log('\n💡 To use webhooks in production:');
  console.log('1. Deploy your app with webhook endpoints');
  console.log('2. Configure webhook URLs in platform developer consoles');
  console.log('3. Set webhook secrets in environment variables');
  console.log('4. Handle webhook events in your application');
}

async function demonstrateAdvancedAnalytics(crosspost) {
  console.log('\n📊 Demonstrating Advanced Analytics...');

  // Simulate some analytics data by recording mock posts
  const mockPosts = [
    {
      content: { text: 'Mock post 1', media: [], hashtags: ['test'] },
      platforms: ['twitter', 'linkedin'],
      successful: [
        { platform: 'twitter', data: { postId: 'tw1', url: 'https://twitter.com/1' } },
        { platform: 'linkedin', data: { postId: 'li1', url: 'https://linkedin.com/1' } }
      ],
      failed: []
    },
    {
      content: { text: 'Mock post 2', media: [{ url: 'image.jpg' }], hashtags: ['test', 'media'] },
      platforms: ['twitter', 'facebook', 'instagram'],
      successful: [
        { platform: 'twitter', data: { postId: 'tw2', url: 'https://twitter.com/2' } },
        { platform: 'facebook', data: { postId: 'fb2', url: 'https://facebook.com/2' } }
      ],
      failed: [
        { platform: 'instagram', error: new Error('Rate limit exceeded') }
      ]
    }
  ];

  // Record analytics data
  for (const post of mockPosts) {
    await crosspost.analytics.recordPost(post);
  }

  // Get comprehensive analytics
  const analytics = await crosspost.getAnalytics('7d');

  console.log('📈 Analytics Summary:');
  console.log(`  Total Posts: ${analytics.summary.totalPosts}`);
  console.log(`  Success Rate: ${analytics.summary.overallSuccessRate.toFixed(1)}%`);
  console.log(`  Platform Posts: ${analytics.summary.totalPlatformPosts}`);

  console.log('\n🎯 Platform Performance:');
  Object.entries(analytics.platformBreakdown).forEach(([platform, stats]) => {
    console.log(`  ${platform.toUpperCase()}:`);
    console.log(`    Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`    Total Attempts: ${stats.totalAttempts}`);
    console.log(`    Successful: ${stats.successful}`);
    console.log(`    Failed: ${stats.failed}`);
  });

  console.log('\n📝 Content Insights:');
  const content = analytics.contentAnalysis;
  console.log(`  Average Text Length: ${content.textLength.average.toFixed(0)} chars`);
  console.log(`  Posts with Media: ${content.mediaUsage.withMedia}`);
  console.log(`  Posts without Media: ${content.mediaUsage.withoutMedia}`);
  console.log(`  Average Hashtags: ${content.hashtagUsage.averageHashtagCount.toFixed(1)}`);

  console.log('\n📊 Trends:');
  console.log(`  Overall Trend: ${analytics.trends.trend}`);

  console.log('\n💡 AI-Powered Recommendations:');
  if (analytics.recommendations.length > 0) {
    analytics.recommendations.forEach(rec => {
      console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
    });
  } else {
    console.log('  No recommendations at this time - great job!');
  }

  // Export analytics
  console.log('\n📄 Exporting Analytics...');
  try {
    const jsonExport = await crosspost.exportAnalytics('json', '7d');
    const csvExport = await crosspost.exportAnalytics('csv', '7d');
    
    console.log(`  JSON Export: ${jsonExport.length} characters`);
    console.log(`  CSV Export: ${csvExport.split('\n').length} lines`);
  } catch (error) {
    console.log(`  Export error: ${error.message}`);
  }
}

async function demonstrateErrorHandling(crosspost) {
  console.log('\n🛡️ Demonstrating Error Handling and Recovery...');

  // Test various error scenarios
  const errorScenarios = [
    {
      name: 'Invalid Platform',
      test: () => crosspost.post({ text: 'Test' }, ['invalid-platform'])
    },
    {
      name: 'Missing Authentication',
      test: () => crosspost.post({ text: 'Test' }, ['twitter'])
    },
    {
      name: 'Invalid Schedule Time',
      test: () => crosspost.schedulePost({ text: 'Test' }, ['twitter'], new Date('2020-01-01'))
    },
    {
      name: 'Content Too Long',
      test: () => crosspost.post({ text: 'x'.repeat(1000) }, ['twitter'])
    }
  ];

  for (const scenario of errorScenarios) {
    try {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      await scenario.test();
      console.log('  ❌ Expected error but none occurred');
    } catch (error) {
      console.log(`  ✅ Caught expected error: ${error.message}`);
    }
  }

  // Demonstrate cleanup of old data
  console.log('\n🧹 Demonstrating Data Cleanup...');
  try {
    const cleanedCount = await crosspost.cleanupOldPosts(30);
    console.log(`  ✅ Cleaned up ${cleanedCount} old scheduled posts`);
  } catch (error) {
    console.log(`  ❌ Cleanup error: ${error.message}`);
  }
}

// Run the example
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  productionExample().catch(console.error);
}

export { productionExample };


