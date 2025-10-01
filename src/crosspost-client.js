/**
 * Crosspost Client - Core posting functionality
 * Handles the actual posting to different social media platforms
 */

import axios from 'axios';
import { RateLimiter } from './rate-limiter.js';
import { MediaUploader } from './media-uploader.js';

export class CrosspostClient {
  constructor(config) {
    this.config = config;
    this.platformClients = new Map();
    this.rateLimiter = new RateLimiter();
    this.mediaUploader = new MediaUploader(config);
    this.isInitialized = false;
    this.retryAttempts = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  async initialize() {
    // Initialize platform-specific clients
    await this.initializePlatformClients();
    this.isInitialized = true;
  }

  async initializePlatformClients() {
    // Twitter/X Client
    this.platformClients.set('twitter', {
      baseURL: 'https://api.twitter.com/2',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // LinkedIn Client
    this.platformClients.set('linkedin', {
      baseURL: 'https://api.linkedin.com/v2',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Facebook Client
    this.platformClients.set('facebook', {
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Instagram Client
    this.platformClients.set('instagram', {
      baseURL: 'https://graph.instagram.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Mastodon Client (configurable instance)
    this.platformClients.set('mastodon', {
      baseURL: this.config.mastodonInstance || 'https://mastodon.social',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Post content to a specific platform
   */
  async postToPlatform(platform, content, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const platformClient = this.platformClients.get(platform);
    if (!platformClient) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Check rate limits
    await this.rateLimiter.waitForReset(platform, 'posts');

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Record the request for rate limiting
        await this.rateLimiter.recordRequest(platform, 'posts');

        let result;
        switch (platform) {
          case 'twitter':
            result = await this.postToTwitter(content, options);
            break;
          case 'linkedin':
            result = await this.postToLinkedIn(content, options);
            break;
          case 'facebook':
            result = await this.postToFacebook(content, options);
            break;
          case 'instagram':
            result = await this.postToInstagram(content, options);
            break;
          case 'mastodon':
            result = await this.postToMastodon(content, options);
            break;
          default:
            throw new Error(`Platform ${platform} not implemented`);
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt}/${this.retryAttempts} failed for ${platform}:`, error.message);

        // Don't retry for certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to post to ${platform} after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Check if error should not be retried
   */
  isNonRetryableError(error) {
    const nonRetryableMessages = [
      'invalid credentials',
      'unauthorized',
      'forbidden',
      'not found',
      'duplicate',
      'invalid media',
      'content too long'
    ];

    const message = error.message.toLowerCase();
    return nonRetryableMessages.some(msg => message.includes(msg));
  }

  /**
   * Post to Twitter/X
   */
  async postToTwitter(content, options) {
    const client = this.platformClients.get('twitter');
    const accessToken = options.accessToken || this.config.twitter?.accessToken;

    if (!accessToken) {
      throw new Error('Twitter access token required');
    }

    try {
      const payload = {
        text: content.text
      };

      // Add media if present
      if (content.media && content.media.length > 0) {
        await this.rateLimiter.waitForReset('twitter', 'uploads');
        await this.rateLimiter.recordRequest('twitter', 'uploads');
        
        const uploadedMedia = await this.mediaUploader.uploadMedia('twitter', content.media, accessToken);
        payload.media = { 
          media_ids: uploadedMedia.map(media => media.mediaId) 
        };
      }

      // Add poll if present
      if (content.poll) {
        payload.poll = {
          options: content.poll.options,
          duration_minutes: content.poll.duration || 1440 // 24 hours default
        };
      }

      // Add reply settings
      if (options.reply_settings) {
        payload.reply_settings = options.reply_settings;
      }

      const response = await axios.post(
        `${client.baseURL}/tweets`,
        payload,
        {
          headers: {
            ...client.headers,
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: this.config.timeout || 30000
        }
      );

      return {
        platform: 'twitter',
        postId: response.data.data.id,
        url: `https://twitter.com/user/status/${response.data.data.id}`,
        response: response.data
      };
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.message || 
                          error.response?.data?.detail || 
                          error.message;
      throw new Error(`Twitter API error: ${errorMessage}`);
    }
  }

  /**
   * Post to LinkedIn
   */
  async postToLinkedIn(content, options) {
    const client = this.platformClients.get('linkedin');
    const accessToken = options.accessToken || this.config.linkedin?.accessToken;
    const personId = options.personId || this.config.linkedin?.personId;

    if (!accessToken || !personId) {
      throw new Error('LinkedIn access token and person ID required');
    }

    const payload = {
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content.text
          },
          shareMediaCategory: content.media ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // Add media if present
    if (content.media && content.media.length > 0) {
      const mediaUrns = await this.uploadLinkedInMedia(content.media, accessToken);
      payload.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns;
    }

    const response = await axios.post(
      `${client.baseURL}/ugcPosts`,
      payload,
      {
        headers: {
          ...client.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return {
      platform: 'linkedin',
      postId: response.data.id,
      url: `https://www.linkedin.com/feed/update/${response.data.id}`,
      response: response.data
    };
  }

  /**
   * Post to Facebook
   */
  async postToFacebook(content, options) {
    const client = this.platformClients.get('facebook');
    const accessToken = options.accessToken || this.config.facebook?.accessToken;
    const pageId = options.pageId || this.config.facebook?.pageId;

    if (!accessToken) {
      throw new Error('Facebook access token required');
    }

    const endpoint = pageId ? `${pageId}/feed` : 'me/feed';
    const payload = {
      message: content.text,
      access_token: accessToken
    };

    // Add media if present
    if (content.media && content.media.length > 0) {
      // For simplicity, using the first image
      payload.url = content.media[0].url;
    }

    const response = await axios.post(
      `${client.baseURL}/${endpoint}`,
      payload,
      {
        headers: client.headers
      }
    );

    return {
      platform: 'facebook',
      postId: response.data.id,
      url: `https://facebook.com/${response.data.id}`,
      response: response.data
    };
  }

  /**
   * Post to Instagram
   */
  async postToInstagram(content, options) {
    const client = this.platformClients.get('instagram');
    const accessToken = options.accessToken || this.config.instagram?.accessToken;
    const accountId = options.accountId || this.config.instagram?.accountId;

    if (!accessToken || !accountId) {
      throw new Error('Instagram access token and account ID required');
    }

    if (!content.media || content.media.length === 0) {
      throw new Error('Instagram posts require media');
    }

    // Create media container
    const containerPayload = {
      image_url: content.media[0].url,
      caption: content.text,
      access_token: accessToken
    };

    const containerResponse = await axios.post(
      `${client.baseURL}/${accountId}/media`,
      containerPayload
    );

    // Publish the media
    const publishPayload = {
      creation_id: containerResponse.data.id,
      access_token: accessToken
    };

    const publishResponse = await axios.post(
      `${client.baseURL}/${accountId}/media_publish`,
      publishPayload
    );

    return {
      platform: 'instagram',
      postId: publishResponse.data.id,
      url: `https://instagram.com/p/${publishResponse.data.id}`,
      response: publishResponse.data
    };
  }

  /**
   * Post to Mastodon
   */
  async postToMastodon(content, options) {
    const client = this.platformClients.get('mastodon');
    const accessToken = options.accessToken || this.config.mastodon?.accessToken;

    if (!accessToken) {
      throw new Error('Mastodon access token required');
    }

    const payload = {
      status: content.text,
      visibility: options.visibility || 'public'
    };

    // Add media if present
    if (content.media && content.media.length > 0) {
      const mediaIds = await this.uploadMastodonMedia(content.media, accessToken);
      payload.media_ids = mediaIds;
    }

    const response = await axios.post(
      `${client.baseURL}/api/v1/statuses`,
      payload,
      {
        headers: {
          ...client.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return {
      platform: 'mastodon',
      postId: response.data.id,
      url: response.data.url,
      response: response.data
    };
  }

  /**
   * Upload media to Twitter
   */
  async uploadTwitterMedia(media, accessToken) {
    // Simplified media upload - in real implementation, handle chunked upload for large files
    const mediaIds = [];
    
    for (const mediaItem of media) {
      // This is a simplified version - real implementation would handle file uploads
      mediaIds.push('mock_media_id_' + Date.now());
    }
    
    return mediaIds;
  }

  /**
   * Upload media to LinkedIn
   */
  async uploadLinkedInMedia(media, accessToken) {
    // Simplified media upload
    const mediaUrns = [];
    
    for (const mediaItem of media) {
      mediaUrns.push({
        status: 'READY',
        description: {
          text: mediaItem.alt || ''
        },
        media: `urn:li:digitalmediaAsset:mock_${Date.now()}`
      });
    }
    
    return mediaUrns;
  }

  /**
   * Upload media to Mastodon
   */
  async uploadMastodonMedia(media, accessToken) {
    const mediaIds = [];
    
    for (const mediaItem of media) {
      // Simplified - real implementation would upload files
      mediaIds.push('mock_media_id_' + Date.now());
    }
    
    return mediaIds;
  }

  /**
   * Get posting status
   */
  async getPostStatus(platform, postId) {
    // Implementation would vary by platform
    return {
      platform,
      postId,
      status: 'published',
      metrics: {
        likes: 0,
        shares: 0,
        comments: 0
      }
    };
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    this.platformClients.clear();
    this.isInitialized = false;
  }
}
