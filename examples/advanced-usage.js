/**
 * Advanced Usage Example for Crosspost Plugin
 * Demonstrates hooks, scheduling, analytics, and error handling
 */

import { CrosspostPlugin } from '../index.js';
import dotenv from 'dotenv';

dotenv.config();

async function advancedExample() {
  console.log('🚀 Starting Crosspost Plugin Advanced Example');

  const crosspost = new CrosspostPlugin({
    enableAnalytics: true,
    autoOptimizeContent: true,
    maxRetries: 3,
    timeout: 30000
  });

  try {
    // Set up event hooks
    setupHooks(crosspost);

    await crosspost.initialize();
    console.log('✅ Plugin initialized with hooks');

    // Demonstrate scheduling
    await demonstrateScheduling(crosspost);

    // Demonstrate batch posting with error handling
    await demonstrateBatchPosting(crosspost);

    // Demonstrate analytics and insights
    await demonstrateAnalytics(crosspost);

    // Demonstrate content transformation hooks
    await demonstrateContentTransformation(crosspost);

  } catch (error) {
    console.error('❌ Error in advanced example:', error.message);
  } finally {
    await crosspost.destroy();
    console.log('👋 Advanced example finished');
  }
}

function setupHooks(crosspost) {
  console.log('🪝 Setting up event hooks...');

  // Before post hook - add custom metadata
  crosspost.on('before-post', (data) => {
    console.log('📝 Before post hook triggered');
    data.metadata = {
      timestamp: new Date().toISOString(),
      source: 'advanced-example',
      version: '1.0.0'
    };
  });

  // After post hook - log results
  crosspost.on('after-post', (data) => {
    console.log('📤 After post hook triggered');
    console.log(`✅ Successful platforms: ${data.successfulPosts.map(p => p.platform).join(', ')}`);
    if (data.failedPosts.length > 0) {
      console.log(`❌ Failed platforms: ${data.failedPosts.map(p => p.platform).join(', ')}`);
    }
  });

  // Error hook - enhanced error logging
  crosspost.on('on-error', (data) => {
    console.error('💥 Error hook triggered');
    console.error(`Platform: ${data.platform || 'unknown'}`);
    console.error(`Error: ${data.error.message}`);
    
    // In a real application, you might:
    // - Send to error tracking service (Sentry, etc.)
    // - Log to file or database
    // - Send notifications to administrators
  });

  // Success hook - track successful posts
  crosspost.on('on-success', (data) => {
    console.log('🎉 Success hook triggered');
    console.log(`Successfully posted to ${data.platform}`);
    
    // In a real application, you might:
    // - Update user statistics
    // - Send confirmation notifications
    // - Update content management system
  });

  // Content transform hook - modify content before optimization
  crosspost.on('content-transform', (data) => {
    console.log('🔄 Content transform hook triggered');
    
    // Example: Add timestamp to content
    const timestamp = new Date().toLocaleString();
    data.content.text += `\n\n[Posted at ${timestamp}]`;
    
    // Example: Add source attribution
    if (!data.content.hashtags.includes('automated')) {
      data.content.hashtags.push('automated');
    }
  });
}

async function demonstrateScheduling(crosspost) {
  console.log('\n📅 Demonstrating Post Scheduling...');

  const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
  
  const scheduleResult = await crosspost.schedulePost(
    {
      text: 'This is a scheduled post from the Crosspost Plugin! ⏰',
      hashtags: ['scheduled', 'automation', 'crosspost']
    },
    ['twitter', 'linkedin'],
    futureTime,
    {
      timezone: 'UTC',
      priority: 'normal'
    }
  );

  console.log('📋 Schedule Result:', {
    scheduleId: scheduleResult.scheduleId,
    scheduledTime: scheduleResult.scheduledTime,
    platforms: scheduleResult.platforms
  });
}

async function demonstrateBatchPosting(crosspost) {
  console.log('\n📦 Demonstrating Batch Posting...');

  const posts = [
    {
      content: {
        text: 'First post in batch - testing reliability! 🚀',
        hashtags: ['batch', 'test', 'first']
      },
      platforms: ['twitter']
    },
    {
      content: {
        text: 'Second post with media content for visual engagement! 📸',
        hashtags: ['batch', 'test', 'media'],
        media: [{
          url: 'https://via.placeholder.com/600x400/ff6b6b/ffffff?text=Batch+Post+2',
          alt: 'Batch posting demonstration'
        }]
      },
      platforms: ['twitter', 'linkedin']
    },
    {
      content: {
        text: 'Third post testing error handling - this might fail on some platforms! ⚠️',
        hashtags: ['batch', 'test', 'error']
      },
      platforms: ['twitter', 'nonexistent-platform'] // Intentional error
    }
  ];

  console.log(`📤 Processing ${posts.length} posts in batch...`);

  for (let i = 0; i < posts.length; i++) {
    const { content, platforms } = posts[i];
    
    try {
      console.log(`\n📝 Processing post ${i + 1}/${posts.length}...`);
      
      // Note: Actual posting commented out for safety
      // const result = await crosspost.post(content, platforms);
      
      // Simulate result for demonstration
      const result = {
        success: platforms.includes('nonexistent-platform') ? false : true,
        successful: platforms.filter(p => p !== 'nonexistent-platform').map(p => ({
          platform: p,
          data: { postId: `mock-${p}-${Date.now()}`, url: `https://${p}.com/mock` }
        })),
        failed: platforms.includes('nonexistent-platform') ? [{
          platform: 'nonexistent-platform',
          error: 'Unsupported platform'
        }] : [],
        summary: {
          total: platforms.length,
          successful: platforms.filter(p => p !== 'nonexistent-platform').length,
          failed: platforms.includes('nonexistent-platform') ? 1 : 0
        }
      };

      console.log(`📊 Post ${i + 1} Results:`, {
        success: result.success,
        successful: result.successful.length,
        failed: result.failed.length
      });

      if (result.failed.length > 0) {
        console.log('⚠️ Failures:', result.failed.map(f => `${f.platform}: ${f.error}`));
      }

    } catch (error) {
      console.error(`❌ Post ${i + 1} failed completely:`, error.message);
    }

    // Add delay between posts to respect rate limits
    if (i < posts.length - 1) {
      console.log('⏳ Waiting 2 seconds before next post...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function demonstrateAnalytics(crosspost) {
  console.log('\n📊 Demonstrating Analytics & Insights...');

  // Simulate some analytics data
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
      platforms: ['twitter', 'facebook'],
      successful: [
        { platform: 'twitter', data: { postId: 'tw2', url: 'https://twitter.com/2' } }
      ],
      failed: [
        { platform: 'facebook', error: new Error('Rate limit exceeded') }
      ]
    }
  ];

  // Record mock analytics data
  for (const post of mockPosts) {
    await crosspost.analytics.recordPost(post);
  }

  // Get analytics
  const analytics = await crosspost.getAnalytics('7d');

  console.log('📈 Analytics Summary:');
  console.log(`  Total Posts: ${analytics.summary.totalPosts}`);
  console.log(`  Success Rate: ${analytics.summary.overallSuccessRate.toFixed(1)}%`);
  console.log(`  Platform Posts: ${analytics.summary.totalPlatformPosts}`);

  console.log('\n🎯 Platform Breakdown:');
  Object.entries(analytics.platformBreakdown).forEach(([platform, stats]) => {
    console.log(`  ${platform.toUpperCase()}:`);
    console.log(`    Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`    Total Attempts: ${stats.totalAttempts}`);
    console.log(`    Successful: ${stats.successful}`);
    console.log(`    Failed: ${stats.failed}`);
  });

  console.log('\n📝 Content Analysis:');
  const content = analytics.contentAnalysis;
  console.log(`  Average Text Length: ${content.textLength.average.toFixed(0)} chars`);
  console.log(`  Posts with Media: ${content.mediaUsage.withMedia}`);
  console.log(`  Posts without Media: ${content.mediaUsage.withoutMedia}`);
  console.log(`  Average Hashtags: ${content.hashtagUsage.averageHashtagCount.toFixed(1)}`);

  console.log('\n💡 Recommendations:');
  if (analytics.recommendations.length > 0) {
    analytics.recommendations.forEach(rec => {
      console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
    });
  } else {
    console.log('  No recommendations at this time');
  }

  // Export analytics
  console.log('\n📄 Exporting Analytics...');
  const jsonExport = await crosspost.analytics.exportAnalytics('json', '7d');
  const csvExport = await crosspost.analytics.exportAnalytics('csv', '7d');
  
  console.log(`  JSON Export: ${jsonExport.length} characters`);
  console.log(`  CSV Export: ${csvExport.split('\n').length} lines`);
}

async function demonstrateContentTransformation(crosspost) {
  console.log('\n🔄 Demonstrating Content Transformation...');

  const originalContent = {
    text: 'Original content before transformation',
    hashtags: ['original', 'test']
  };

  console.log('📝 Original Content:', originalContent);

  // The content-transform hook we set up earlier will modify this
  await crosspost.emit('content-transform', { content: originalContent });

  console.log('🔄 Transformed Content:', originalContent);

  // Demonstrate platform-specific optimization
  const platforms = ['twitter', 'linkedin', 'instagram'];
  
  console.log('\n🎯 Platform-Specific Optimizations:');
  
  for (const platform of platforms) {
    try {
      const optimized = await crosspost.optimizer.optimizeForPlatform(
        {
          text: 'This is a long piece of content that will be optimized differently for each social media platform based on their specific requirements and best practices.',
          hashtags: ['optimization', 'crosspost', 'socialmedia', 'automation', 'content'],
          media: platform === 'instagram' ? [{ url: 'image.jpg', alt: 'Required for Instagram' }] : []
        },
        platform
      );

      console.log(`  ${platform.toUpperCase()}:`);
      console.log(`    Text Length: ${optimized.text.length} chars`);
      console.log(`    Hashtags: ${optimized.hashtags.length}`);
      console.log(`    Media: ${optimized.media.length} items`);
      console.log(`    Platform: ${optimized.platform}`);

    } catch (error) {
      console.log(`  ${platform.toUpperCase()}: ❌ ${error.message}`);
    }
  }
}

// Run the example
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  advancedExample().catch(console.error);
}

export { advancedExample };
