/**
 * Crosspost Plugin Configuration
 * This file defines the plugin's metadata, capabilities, and configuration options
 */

export const pluginConfig = {
  // Plugin Identity
  name: 'crosspost-plugin',
  version: '1.0.0',
  description: 'Enhanced crosspost functionality for multi-platform social media posting',
  
  // Plugin Type and Category
  type: 'service',
  category: 'social-media',
  
  // Plugin Capabilities
  capabilities: [
    'post-creation',
    'multi-platform-posting',
    'authentication',
    'content-optimization',
    'scheduling',
    'analytics'
  ],
  
  // Supported Platforms
  supportedPlatforms: [
    {
      name: 'twitter',
      displayName: 'Twitter/X',
      authType: 'oauth2',
      features: ['text', 'images', 'videos', 'threads']
    },
    {
      name: 'linkedin',
      displayName: 'LinkedIn',
      authType: 'oauth2',
      features: ['text', 'images', 'articles']
    },
    {
      name: 'facebook',
      displayName: 'Facebook',
      authType: 'oauth2',
      features: ['text', 'images', 'videos', 'stories']
    },
    {
      name: 'instagram',
      displayName: 'Instagram',
      authType: 'oauth2',
      features: ['images', 'videos', 'stories', 'reels']
    },
    {
      name: 'mastodon',
      displayName: 'Mastodon',
      authType: 'oauth2',
      features: ['text', 'images', 'videos']
    }
  ],
  
  // Configuration Schema
  configSchema: {
    apiKeys: {
      type: 'object',
      required: true,
      properties: {
        twitter: {
          clientId: { type: 'string', required: true },
          clientSecret: { type: 'string', required: true }
        },
        linkedin: {
          clientId: { type: 'string', required: true },
          clientSecret: { type: 'string', required: true }
        },
        facebook: {
          appId: { type: 'string', required: true },
          appSecret: { type: 'string', required: true }
        }
      }
    },
    defaultSettings: {
      type: 'object',
      properties: {
        autoOptimizeContent: { type: 'boolean', default: true },
        enableAnalytics: { type: 'boolean', default: true },
        maxRetries: { type: 'number', default: 3 },
        timeout: { type: 'number', default: 30000 }
      }
    }
  },
  
  // Plugin Hooks and Events
  hooks: [
    'before-post',
    'after-post',
    'on-error',
    'on-success',
    'content-transform'
  ],
  
  // API Endpoints
  endpoints: {
    post: '/api/crosspost/post',
    auth: '/api/crosspost/auth',
    status: '/api/crosspost/status',
    analytics: '/api/crosspost/analytics'
  },
  
  // Plugin Dependencies
  dependencies: {
    required: [],
    optional: ['analytics-plugin', 'content-optimizer-plugin']
  },
  
  // Plugin Permissions
  permissions: [
    'network-access',
    'storage-access',
    'user-authentication'
  ],

  // Default Settings
  defaultSettings: {
    autoOptimizeContent: true,
    enableAnalytics: true,
    maxRetries: 3,
    timeout: 30000
  }
};

export default pluginConfig;
