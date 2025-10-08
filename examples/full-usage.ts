import { 
  CrosspostPluginClient, 
  type CreatePostRequest,
  type MediaNormalizationOptions,
  type RequestOverride,
  type CrosspostError
} from '../src/client';

async function fullUsageExample() {
  console.log('🚀 Crosspost Plugin - Full Usage Example');
  
  // Initialize client
  const client = new CrosspostPluginClient({
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near',
    timeout: 30000
  });

  try {
    // ===== SYSTEM API =====
    console.log('\n📊 System API');
    
    // Health check
    const health = await client.health();
    console.log('✅ Health:', health.status);
    
    // Rate limits
    const rateLimits = await client.getRateLimits();
    console.log('📈 Rate limits:', rateLimits.global.remaining, 'remaining');
    
    // ===== AUTH API =====
    console.log('\n🔐 Auth API');
    
    // Set NEAR authentication
    client.setAuth({
      nearSignature: 'YOUR_NEAR_SIGNATURE_TOKEN',
      accountId: 'your.near'
    });
    
    // Get auth status
    const authStatus = await client.getAuthStatus();
    console.log('🔑 Auth status:', authStatus.isAuthenticated);
    
    // Get connected accounts
    const connectedAccounts = await client.getConnectedAccounts();
    console.log('🔗 Connected accounts:', connectedAccounts.length);
    
    // ===== MEDIA HANDLING =====
    console.log('\n📸 Media Handling');
    
    // Normalize media from different sources
    const mediaOptions: MediaNormalizationOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
      thumbnailSize: { width: 300, height: 300 }
    };
    
    // Example with base64 image
    const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...';
    const normalizedMedia = await client.normalizeMedia(base64Image, mediaOptions);
    console.log('📷 Normalized media:', normalizedMedia.type, normalizedMedia.size, 'bytes');
    
    // ===== POST API =====
    console.log('\n📝 Post API');
    
    // Create post with media
    const postRequest: CreatePostRequest = {
      content: {
        text: 'Hello from Crosspost Plugin! 🚀',
        media: [{
          type: 'image',
          url: `data:${normalizedMedia.mimeType};base64,${normalizedMedia.data}`,
          alt: 'Crosspost plugin demo'
        }],
        hashtags: ['crosspost', 'demo'],
        mentions: ['@opencrosspost']
      },
      platforms: ['twitter', 'mastodon'],
      visibility: 'public',
      replySettings: 'everyone'
    };
    
    const postResult = await client.createPost(postRequest);
    console.log('✅ Post created:', postResult.post.id);
    
    // Like a post
    await client.likePost({
      postId: 'some-post-id',
      platforms: ['twitter']
    });
    console.log('👍 Post liked');
    
    // ===== ACTIVITY API =====
    console.log('\n📈 Activity API');
    
    // Get leaderboard
    const leaderboard = await client.getLeaderboard('weekly', 10);
    console.log('🏆 Leaderboard:', leaderboard.entries.length, 'entries');
    
    // Get account activity
    const activity = await client.getAccountActivity('your.near', {
      page: 1,
      limit: 20,
      types: ['post', 'like', 'repost']
    });
    console.log('📊 Account activity:', activity.activities.length, 'items');
    
    // ===== REQUEST OVERRIDES =====
    console.log('\n🔄 Request Overrides');
    
    // Use different auth for specific request
    const override: RequestOverride = {
      authToken: 'DIFFERENT_NEAR_SIGNATURE',
      accountId: 'different.near',
      timeout: 15000
    };
    
    const healthWithOverride = await client.healthWithOverrides(override);
    console.log('🔄 Health with override:', healthWithOverride.status);
    
    // ===== ERROR HANDLING =====
    console.log('\n⚠️ Error Handling');
    
    try {
      await client.createPost({
        content: { text: 'This will fail' },
        platforms: ['invalid-platform']
      });
    } catch (error) {
      const crosspostError = error as CrosspostError;
      console.log('❌ Error caught:', crosspostError.code, crosspostError.message);
    }
    
    console.log('\n🎉 Full usage example completed!');
    
  } catch (error) {
    console.error('💥 Error in example:', error);
  }
}

// Module Federation usage example
async function moduleFederationExample() {
  console.log('\n🔗 Module Federation Example');
  
  // In your host app after loading the remote:
  const { CrosspostPluginClient } = await import('crosspost_plugin/plugin');
  
  const client = new CrosspostPluginClient({
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near'
  });
  
  // Use the same API as above
  const health = await client.health();
  console.log('✅ MF Health:', health.status);
}

// Export examples
export { fullUsageExample, moduleFederationExample };
