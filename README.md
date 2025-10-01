# Crosspost Plugin

A comprehensive plugin that replaces the crosspost SDK with enhanced functionality for cross-platform social media posting. This plugin provides a unified interface for posting content to multiple social media platforms including Twitter/X, LinkedIn, Facebook, Instagram, and Mastodon.

## Features

- 🚀 **Multi-Platform Support**: Post to Twitter, LinkedIn, Facebook, Instagram, and Mastodon
- 🔐 **OAuth2 Authentication**: Secure authentication flow for all platforms
- 🎯 **Content Optimization**: Automatically optimize content for each platform's requirements
- 📊 **Analytics & Insights**: Track posting performance and get actionable insights
- 🔄 **Retry Logic**: Automatic retry on failures with exponential backoff
- 📅 **Scheduling**: Schedule posts for optimal timing
- 🎨 **Media Support**: Handle images, videos, and other media types
- 🏷️ **Smart Hashtags**: Platform-specific hashtag optimization
- 🔌 **Plugin Architecture**: Extensible hook system for custom functionality

## Installation

```bash
npm install crosspost-plugin
```

## Quick Start

```javascript
import { CrosspostPlugin } from 'crosspost-plugin';

// Create plugin instance
const crosspost = new CrosspostPlugin({
  enableAnalytics: true,
  autoOptimizeContent: true
});

// Initialize the plugin
await crosspost.initialize();

// Authenticate with platforms
await crosspost.authenticate('twitter', {
  clientId: 'your-twitter-client-id',
  clientSecret: 'your-twitter-client-secret',
  redirectUri: 'http://localhost:3000/callback'
});

// Post to multiple platforms
const result = await crosspost.post(
  {
    text: 'Hello from the crosspost plugin! 🚀',
    hashtags: ['crosspost', 'socialmedia'],
    media: [{
      url: 'https://example.com/image.jpg',
      alt: 'Example image'
    }]
  },
  ['twitter', 'linkedin', 'facebook']
);

console.log('Posted successfully:', result.successful);
console.log('Failed posts:', result.failed);
```

## Configuration

### Plugin Configuration

```javascript
const config = {
  // Enable analytics collection
  enableAnalytics: true,
  
  // Auto-optimize content for each platform
  autoOptimizeContent: true,
  
  // Maximum retry attempts
  maxRetries: 3,
  
  // Request timeout in milliseconds
  timeout: 30000,
  
  // Mastodon instance (if using Mastodon)
  mastodonInstance: 'https://mastodon.social'
};

const crosspost = new CrosspostPlugin(config);
```

### Platform API Keys

Set up your API credentials for each platform:

```javascript
// Environment variables (recommended)
process.env.TWITTER_CLIENT_ID = 'your-twitter-client-id';
process.env.TWITTER_CLIENT_SECRET = 'your-twitter-client-secret';
process.env.LINKEDIN_CLIENT_ID = 'your-linkedin-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'your-linkedin-client-secret';
// ... etc for other platforms
```

## API Reference

### CrosspostPlugin

#### Methods

##### `initialize()`
Initialize the plugin and all its components.

```javascript
await crosspost.initialize();
```

##### `post(content, platforms, options)`
Post content to multiple platforms.

```javascript
const result = await crosspost.post(
  {
    text: 'Your post content',
    hashtags: ['tag1', 'tag2'],
    media: [{ url: 'image.jpg', alt: 'Description' }]
  },
  ['twitter', 'linkedin'],
  { 
    visibility: 'public' // Platform-specific options
  }
);
```

**Parameters:**
- `content` (Object): The content to post
  - `text` (string): The main text content
  - `hashtags` (Array): Array of hashtags (without #)
  - `media` (Array): Array of media objects
  - `mentions` (Array): Array of user mentions
- `platforms` (Array): Array of platform names to post to
- `options` (Object): Additional options for posting

**Returns:** Promise resolving to posting results

##### `authenticate(platform, credentials)`
Authenticate with a social media platform.

```javascript
// Get authorization URL
const authResult = await crosspost.authenticate('twitter', {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/callback'
});

// Complete authentication with authorization code
const tokenResult = await crosspost.authenticate('twitter', {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/callback',
  code: 'authorization-code-from-callback'
});
```

##### `getAuthStatus(platforms)`
Check authentication status for platforms.

```javascript
const status = await crosspost.getAuthStatus(['twitter', 'linkedin']);
console.log(status.twitter.authenticated); // true/false
```

##### `schedulePost(content, platforms, scheduledTime, options)`
Schedule a post for later publication.

```javascript
const scheduleResult = await crosspost.schedulePost(
  { text: 'Scheduled post content' },
  ['twitter'],
  new Date(Date.now() + 3600000), // 1 hour from now
  { timezone: 'UTC' }
);
```

##### `getAnalytics(timeRange)`
Get analytics data for posted content.

```javascript
const analytics = await crosspost.getAnalytics('7d');
console.log(analytics.summary);
console.log(analytics.platformBreakdown);
```

##### `on(event, callback)`
Register event hooks.

```javascript
crosspost.on('before-post', (data) => {
  console.log('About to post:', data.content);
});

crosspost.on('after-post', (data) => {
  console.log('Posted successfully:', data.successfulPosts);
});
```

### Content Optimization

The plugin automatically optimizes content for each platform:

- **Twitter**: Truncates to 280 characters, optimizes hashtag placement
- **LinkedIn**: Professional tone adjustment, hashtags at end
- **Facebook**: Longer content support, engagement optimization
- **Instagram**: Requires media, hashtag optimization (up to 30)
- **Mastodon**: Instance-specific limits, content warnings support

### Supported Platforms

| Platform | Text Limit | Media Limit | Auth Type | Features |
|----------|------------|-------------|-----------|----------|
| Twitter/X | 280 chars | 4 items | OAuth2 | Text, Images, Videos, Threads |
| LinkedIn | 3000 chars | 9 items | OAuth2 | Text, Images, Articles |
| Facebook | 63K chars | 10 items | OAuth2 | Text, Images, Videos, Stories |
| Instagram | 2200 chars | 10 items | OAuth2 | Images, Videos, Stories, Reels |
| Mastodon | 500 chars* | 4 items | OAuth2 | Text, Images, Videos |

*Varies by instance

## Error Handling

The plugin provides comprehensive error handling:

```javascript
try {
  const result = await crosspost.post(content, platforms);
  
  if (!result.success) {
    console.log('Some posts failed:');
    result.failed.forEach(failure => {
      console.log(`${failure.platform}: ${failure.error}`);
    });
  }
} catch (error) {
  console.error('Critical error:', error.message);
}
```

## Analytics and Insights

Get detailed analytics about your posting performance:

```javascript
const analytics = await crosspost.getAnalytics('30d');

console.log('Summary:', analytics.summary);
// {
//   totalPosts: 45,
//   successfulPosts: 42,
//   failedPosts: 3,
//   overallSuccessRate: 93.33
// }

console.log('Platform Performance:', analytics.platformBreakdown);
// {
//   twitter: { successRate: 95.2, totalAttempts: 21 },
//   linkedin: { successRate: 90.9, totalAttempts: 22 }
// }

console.log('Recommendations:', analytics.recommendations);
// Array of actionable insights to improve posting performance
```

## Hooks and Events

Extend functionality with hooks:

```javascript
// Content transformation
crosspost.on('content-transform', (data) => {
  // Modify content before posting
  data.content.text = data.content.text.toUpperCase();
});

// Error handling
crosspost.on('on-error', (data) => {
  console.error('Posting failed:', data.error);
  // Send to error tracking service
});

// Success tracking
crosspost.on('on-success', (data) => {
  console.log('Post successful:', data.platform);
  // Update internal metrics
});
```

## Testing

Run the test suite:

```bash
npm test
```

Run specific test files:

```bash
npm test -- test/crosspost-plugin.test.js
npm test -- test/integration.test.js
```

## Development

### Project Structure

```
crosspost-plugin/
├── src/
│   ├── crosspost-client.js     # Core posting functionality
│   ├── auth-manager.js         # OAuth2 authentication
│   ├── content-optimizer.js    # Platform-specific optimization
│   └── analytics-collector.js  # Analytics and insights
├── test/
│   ├── crosspost-plugin.test.js # Unit tests
│   └── integration.test.js      # Integration tests
├── index.js                    # Main plugin entry point
├── plugin.config.js            # Plugin configuration
└── package.json
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## Security Considerations

- Store API credentials securely (use environment variables)
- Implement proper token refresh logic
- Use HTTPS for all API communications
- Validate and sanitize all user input
- Implement rate limiting to respect platform limits

## Rate Limiting

The plugin respects platform rate limits:

- **Twitter**: 300 tweets per 15-minute window
- **LinkedIn**: 100 posts per day
- **Facebook**: Varies by app and user
- **Instagram**: 200 posts per hour
- **Mastodon**: Varies by instance

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](https://github.com/your-org/crosspost-plugin/docs)
- 🐛 [Issue Tracker](https://github.com/your-org/crosspost-plugin/issues)
- 💬 [Discussions](https://github.com/your-org/crosspost-plugin/discussions)

## Changelog

### v1.0.0
- Initial release
- Multi-platform posting support
- OAuth2 authentication
- Content optimization
- Analytics collection
- Comprehensive test suite
