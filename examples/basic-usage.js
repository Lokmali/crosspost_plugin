/**
 * Basic Usage Example for Crosspost Plugin
 */

import { CrosspostPlugin } from '../index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function basicExample() {
  console.log('🚀 Starting Crosspost Plugin Basic Example');

  // Create plugin instance
  const crosspost = new CrosspostPlugin({
    enableAnalytics: true,
    autoOptimizeContent: true,
    maxRetries: 3
  });

  try {
    // Initialize the plugin
    console.log('📦 Initializing plugin...');
    await crosspost.initialize();
    console.log('✅ Plugin initialized successfully');

    // Check plugin info
    const info = crosspost.getInfo();
    console.log('ℹ️ Plugin Info:', {
      name: info.name,
      version: info.version,
      supportedPlatforms: info.supportedPlatforms.map(p => p.name)
    });

    // Example: Authenticate with Twitter (you'll need to set up OAuth)
    if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
      console.log('🔐 Setting up Twitter authentication...');
      
      const authResult = await crosspost.authenticate('twitter', {
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
        redirectUri: 'http://localhost:3000/callback'
      });

      if (!authResult.success) {
        console.log('🔗 Visit this URL to authenticate with Twitter:');
        console.log(authResult.authUrl);
        console.log('💡 After authentication, run this example again with the code parameter');
        return;
      }
    }

    // Check authentication status
    const authStatus = await crosspost.getAuthStatus(['twitter', 'linkedin', 'facebook']);
    console.log('🔑 Authentication Status:', authStatus);

    // Example content
    const content = {
      text: 'Hello from the Crosspost Plugin! 🚀 This is a test post to demonstrate multi-platform posting capabilities.',
      hashtags: ['crosspost', 'socialmedia', 'automation', 'nodejs'],
      media: [
        {
          url: 'https://via.placeholder.com/800x600/0066cc/ffffff?text=Crosspost+Plugin',
          alt: 'Crosspost Plugin demonstration image'
        }
      ]
    };

    // Platforms to post to (only use authenticated platforms in real usage)
    const platforms = ['twitter']; // Add more platforms as you authenticate

    console.log('📝 Content to post:', {
      textLength: content.text.length,
      hashtagCount: content.hashtags.length,
      mediaCount: content.media.length,
      platforms: platforms
    });

    // Demonstrate content optimization
    console.log('🎯 Optimizing content for platforms...');
    const optimizedContent = await crosspost.optimizer.optimizeForPlatforms(content, platforms);
    
    platforms.forEach(platform => {
      console.log(`📱 ${platform.toUpperCase()} optimized:`, {
        textLength: optimizedContent[platform].text.length,
        platform: optimizedContent[platform].platform
      });
    });

    // Validate content for each platform
    platforms.forEach(platform => {
      const validation = crosspost.optimizer.validateContent(content, platform);
      console.log(`✅ ${platform} validation:`, validation.valid ? 'PASSED' : 'FAILED');
      if (!validation.valid) {
        console.log('❌ Validation errors:', validation.errors);
      }
    });

    // Get platform recommendations
    platforms.forEach(platform => {
      const recommendations = crosspost.optimizer.getPlatformRecommendations(platform);
      console.log(`💡 ${platform} recommendations:`, recommendations.slice(0, 2));
    });

    // Note: Actual posting is commented out to avoid accidental posts
    // Uncomment the following section when you're ready to post for real
    
    /*
    console.log('📤 Posting to platforms...');
    const result = await crosspost.post(content, platforms);

    console.log('📊 Posting Results:');
    console.log(`✅ Successful: ${result.successful.length}/${result.summary.total}`);
    console.log(`❌ Failed: ${result.failed.length}/${result.summary.total}`);
    console.log(`📈 Success Rate: ${((result.successful.length / result.summary.total) * 100).toFixed(1)}%`);

    if (result.successful.length > 0) {
      console.log('🎉 Successful posts:');
      result.successful.forEach(post => {
        console.log(`  ${post.platform}: ${post.data.url}`);
      });
    }

    if (result.failed.length > 0) {
      console.log('💥 Failed posts:');
      result.failed.forEach(failure => {
        console.log(`  ${failure.platform}: ${failure.error}`);
      });
    }

    // Get analytics after posting
    if (crosspost.config.enableAnalytics) {
      console.log('📊 Getting analytics...');
      const analytics = await crosspost.getAnalytics('7d');
      
      console.log('📈 Analytics Summary:', {
        totalPosts: analytics.summary.totalPosts,
        successRate: analytics.summary.overallSuccessRate.toFixed(1) + '%',
        platformCount: Object.keys(analytics.platformBreakdown).length
      });

      if (analytics.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        analytics.recommendations.forEach(rec => {
          console.log(`  ${rec.priority.toUpperCase()}: ${rec.message}`);
        });
      }
    }
    */

    console.log('✨ Example completed successfully!');

  } catch (error) {
    console.error('❌ Error in basic example:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    await crosspost.destroy();
    console.log('👋 Example finished');
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  basicExample().catch(console.error);
}

export { basicExample };
