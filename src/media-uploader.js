/**
 * Media Uploader
 * Handles media uploads for different platforms
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export class MediaUploader {
  constructor(config) {
    this.config = config;
    this.uploadEndpoints = {
      twitter: 'https://upload.twitter.com/1.1/media/upload.json',
      linkedin: 'https://api.linkedin.com/v2/assets',
      facebook: 'https://graph.facebook.com/v18.0/me/photos',
      instagram: 'https://graph.instagram.com/me/media',
      mastodon: '/api/v2/media' // Relative to instance URL
    };
  }

  /**
   * Upload media to platform
   */
  async uploadMedia(platform, mediaItems, accessToken, options = {}) {
    const uploadedMedia = [];
    
    for (const mediaItem of mediaItems) {
      try {
        const result = await this.uploadSingleMedia(platform, mediaItem, accessToken, options);
        uploadedMedia.push(result);
      } catch (error) {
        console.error(`Failed to upload media to ${platform}:`, error.message);
        throw error;
      }
    }
    
    return uploadedMedia;
  }

  /**
   * Upload single media item
   */
  async uploadSingleMedia(platform, mediaItem, accessToken, options = {}) {
    switch (platform) {
      case 'twitter':
        return await this.uploadToTwitter(mediaItem, accessToken, options);
      case 'linkedin':
        return await this.uploadToLinkedIn(mediaItem, accessToken, options);
      case 'facebook':
        return await this.uploadToFacebook(mediaItem, accessToken, options);
      case 'instagram':
        return await this.uploadToInstagram(mediaItem, accessToken, options);
      case 'mastodon':
        return await this.uploadToMastodon(mediaItem, accessToken, options);
      default:
        throw new Error(`Media upload not supported for platform: ${platform}`);
    }
  }

  /**
   * Upload media to Twitter
   */
  async uploadToTwitter(mediaItem, accessToken, options = {}) {
    const mediaData = await this.getMediaData(mediaItem);
    const mediaType = this.getMediaType(mediaItem);
    
    if (mediaData.length > 5 * 1024 * 1024) { // 5MB limit for images
      return await this.uploadToTwitterChunked(mediaItem, accessToken, options);
    }

    try {
      const response = await axios.post(
        this.uploadEndpoints.twitter,
        {
          media_data: mediaData.toString('base64'),
          media_category: this.getTwitterMediaCategory(mediaType),
          alt_text: { text: mediaItem.alt || '' }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        platform: 'twitter',
        mediaId: response.data.media_id_string,
        url: response.data.url,
        type: mediaType
      };
    } catch (error) {
      throw new Error(`Twitter media upload failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Upload large media to Twitter using chunked upload
   */
  async uploadToTwitterChunked(mediaItem, accessToken, options = {}) {
    const mediaData = await this.getMediaData(mediaItem);
    const mediaType = this.getMediaType(mediaItem);
    const chunkSize = 1024 * 1024; // 1MB chunks
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
      // Initialize upload
      const initResponse = await axios.post(
        this.uploadEndpoints.twitter,
        {
          command: 'INIT',
          total_bytes: mediaData.length,
          media_type: mediaType,
          media_category: this.getTwitterMediaCategory(mediaType)
        },
        { headers }
      );

      const mediaId = initResponse.data.media_id_string;

      // Upload chunks
      for (let i = 0; i < mediaData.length; i += chunkSize) {
        const chunk = mediaData.slice(i, i + chunkSize);
        const segmentIndex = Math.floor(i / chunkSize);

        await axios.post(
          this.uploadEndpoints.twitter,
          {
            command: 'APPEND',
            media_id: mediaId,
            segment_index: segmentIndex,
            media_data: chunk.toString('base64')
          },
          { headers }
        );
      }

      // Finalize upload
      const finalizeResponse = await axios.post(
        this.uploadEndpoints.twitter,
        {
          command: 'FINALIZE',
          media_id: mediaId
        },
        { headers }
      );

      // Add alt text if provided
      if (mediaItem.alt) {
        await axios.post(
          'https://upload.twitter.com/1.1/media/metadata/create.json',
          {
            media_id: mediaId,
            alt_text: { text: mediaItem.alt }
          },
          { headers }
        );
      }

      return {
        platform: 'twitter',
        mediaId: mediaId,
        type: mediaType,
        processingInfo: finalizeResponse.data.processing_info
      };
    } catch (error) {
      throw new Error(`Twitter chunked upload failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Upload media to LinkedIn
   */
  async uploadToLinkedIn(mediaItem, accessToken, options = {}) {
    const mediaData = await this.getMediaData(mediaItem);
    const mediaType = this.getMediaType(mediaItem);
    
    try {
      // Register upload
      const registerResponse = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${options.personId}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Upload media
      await axios.put(uploadUrl, mediaData, {
        headers: {
          'Content-Type': mediaType
        }
      });

      return {
        platform: 'linkedin',
        asset: asset,
        type: mediaType
      };
    } catch (error) {
      throw new Error(`LinkedIn media upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Upload media to Facebook
   */
  async uploadToFacebook(mediaItem, accessToken, options = {}) {
    const mediaData = await this.getMediaData(mediaItem);
    
    try {
      const formData = new FormData();
      formData.append('source', new Blob([mediaData]), mediaItem.filename || 'media');
      formData.append('access_token', accessToken);
      
      if (mediaItem.alt) {
        formData.append('alt_text_custom', mediaItem.alt);
      }

      const response = await axios.post(
        this.uploadEndpoints.facebook,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return {
        platform: 'facebook',
        mediaId: response.data.id,
        type: this.getMediaType(mediaItem)
      };
    } catch (error) {
      throw new Error(`Facebook media upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload media to Instagram
   */
  async uploadToInstagram(mediaItem, accessToken, options = {}) {
    const mediaType = this.getMediaType(mediaItem);
    
    try {
      let endpoint = `https://graph.instagram.com/${options.accountId}/media`;
      let payload = {
        access_token: accessToken
      };

      if (mediaType.startsWith('image/')) {
        payload.image_url = mediaItem.url;
        payload.caption = mediaItem.caption || '';
      } else if (mediaType.startsWith('video/')) {
        payload.video_url = mediaItem.url;
        payload.caption = mediaItem.caption || '';
        payload.media_type = 'VIDEO';
      }

      const response = await axios.post(endpoint, payload);

      return {
        platform: 'instagram',
        mediaId: response.data.id,
        type: mediaType
      };
    } catch (error) {
      throw new Error(`Instagram media upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Upload media to Mastodon
   */
  async uploadToMastodon(mediaItem, accessToken, options = {}) {
    const mediaData = await this.getMediaData(mediaItem);
    const instance = options.instance || this.config.mastodonInstance || 'https://mastodon.social';
    
    try {
      const formData = new FormData();
      formData.append('file', new Blob([mediaData]), mediaItem.filename || 'media');
      
      if (mediaItem.alt) {
        formData.append('description', mediaItem.alt);
      }

      const response = await axios.post(
        `${instance}${this.uploadEndpoints.mastodon}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return {
        platform: 'mastodon',
        mediaId: response.data.id,
        url: response.data.url,
        type: response.data.type
      };
    } catch (error) {
      throw new Error(`Mastodon media upload failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get media data from various sources
   */
  async getMediaData(mediaItem) {
    if (mediaItem.data) {
      // Direct buffer/data
      return Buffer.isBuffer(mediaItem.data) ? mediaItem.data : Buffer.from(mediaItem.data);
    }
    
    if (mediaItem.path) {
      // Local file path
      return await fs.readFile(mediaItem.path);
    }
    
    if (mediaItem.url) {
      // Remote URL
      const response = await axios.get(mediaItem.url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    }
    
    throw new Error('Media item must have data, path, or url property');
  }

  /**
   * Get media type from media item
   */
  getMediaType(mediaItem) {
    if (mediaItem.type) {
      return mediaItem.type;
    }
    
    if (mediaItem.filename) {
      const ext = path.extname(mediaItem.filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.webm': 'video/webm'
      };
      return mimeTypes[ext] || 'application/octet-stream';
    }
    
    if (mediaItem.url) {
      const ext = path.extname(new URL(mediaItem.url).pathname).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.webm': 'video/webm'
      };
      return mimeTypes[ext] || 'application/octet-stream';
    }
    
    return 'application/octet-stream';
  }

  /**
   * Get Twitter media category
   */
  getTwitterMediaCategory(mediaType) {
    if (mediaType.startsWith('image/')) {
      return 'tweet_image';
    } else if (mediaType.startsWith('video/')) {
      return 'tweet_video';
    } else if (mediaType.startsWith('image/gif')) {
      return 'tweet_gif';
    }
    return 'tweet_image';
  }

  /**
   * Validate media for platform
   */
  validateMedia(platform, mediaItem) {
    const limits = {
      twitter: {
        maxSize: 5 * 1024 * 1024, // 5MB for images, 512MB for videos
        supportedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
      },
      linkedin: {
        maxSize: 100 * 1024 * 1024, // 100MB
        supportedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
      },
      facebook: {
        maxSize: 100 * 1024 * 1024, // 100MB
        supportedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
      },
      instagram: {
        maxSize: 100 * 1024 * 1024, // 100MB
        supportedTypes: ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime']
      },
      mastodon: {
        maxSize: 10 * 1024 * 1024, // 10MB
        supportedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
      }
    };

    const platformLimits = limits[platform];
    if (!platformLimits) {
      throw new Error(`Validation not available for platform: ${platform}`);
    }

    const mediaType = this.getMediaType(mediaItem);
    
    if (!platformLimits.supportedTypes.includes(mediaType)) {
      throw new Error(`Media type ${mediaType} not supported by ${platform}`);
    }

    // Size validation would require getting the actual data
    // This is a simplified version
    return true;
  }
}


