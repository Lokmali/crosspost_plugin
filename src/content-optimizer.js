/**
 * Content Optimizer
 * Optimizes content for different social media platforms based on their requirements and best practices
 */

export class ContentOptimizer {
  constructor(config) {
    this.config = config;
    this.platformLimits = {
      twitter: {
        textLimit: 280,
        mediaLimit: 4,
        videoLimit: 512 * 1024 * 1024, // 512MB
        imageLimit: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov']
      },
      linkedin: {
        textLimit: 3000,
        mediaLimit: 9,
        videoLimit: 5 * 1024 * 1024 * 1024, // 5GB
        imageLimit: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'wmv', 'flv']
      },
      facebook: {
        textLimit: 63206,
        mediaLimit: 10,
        videoLimit: 10 * 1024 * 1024 * 1024, // 10GB
        imageLimit: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'mp4', 'mov', 'avi']
      },
      instagram: {
        textLimit: 2200,
        mediaLimit: 10,
        videoLimit: 4 * 1024 * 1024 * 1024, // 4GB
        imageLimit: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
        aspectRatios: {
          square: { min: 0.8, max: 1.91 },
          portrait: { min: 0.8, max: 1.91 },
          landscape: { min: 1.91, max: 1.91 }
        }
      },
      mastodon: {
        textLimit: 500, // Default, can vary by instance
        mediaLimit: 4,
        videoLimit: 40 * 1024 * 1024, // 40MB
        imageLimit: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm']
      }
    };
  }

  /**
   * Optimize content for multiple platforms
   */
  async optimizeForPlatforms(content, platforms) {
    const optimizedContent = {};

    for (const platform of platforms) {
      optimizedContent[platform] = await this.optimizeForPlatform(content, platform);
    }

    return optimizedContent;
  }

  /**
   * Optimize content for a specific platform
   */
  async optimizeForPlatform(content, platform) {
    const limits = this.platformLimits[platform];
    if (!limits) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const optimized = {
      text: await this.optimizeText(content.text, platform),
      media: content.media ? await this.optimizeMedia(content.media, platform) : [],
      hashtags: content.hashtags ? await this.optimizeHashtags(content.hashtags, platform) : [],
      mentions: content.mentions ? await this.optimizeMentions(content.mentions, platform) : []
    };

    // Platform-specific optimizations
    switch (platform) {
      case 'twitter':
        return this.optimizeForTwitter(optimized);
      case 'linkedin':
        return this.optimizeForLinkedIn(optimized);
      case 'facebook':
        return this.optimizeForFacebook(optimized);
      case 'instagram':
        return this.optimizeForInstagram(optimized);
      case 'mastodon':
        return this.optimizeForMastodon(optimized);
      default:
        return optimized;
    }
  }

  /**
   * Optimize text content for platform limits
   */
  async optimizeText(text, platform) {
    const limits = this.platformLimits[platform];
    
    if (!text || text.length <= limits.textLimit) {
      return text;
    }

    // Truncate text intelligently
    let optimizedText = text.substring(0, limits.textLimit - 3);
    
    // Try to break at word boundary
    const lastSpace = optimizedText.lastIndexOf(' ');
    if (lastSpace > limits.textLimit * 0.8) {
      optimizedText = optimizedText.substring(0, lastSpace);
    }
    
    // Add ellipsis
    optimizedText += '...';
    
    return optimizedText;
  }

  /**
   * Optimize media for platform requirements
   */
  async optimizeMedia(media, platform) {
    const limits = this.platformLimits[platform];
    const optimizedMedia = [];

    for (let i = 0; i < Math.min(media.length, limits.mediaLimit); i++) {
      const mediaItem = media[i];
      
      // Check if format is supported
      const extension = this.getFileExtension(mediaItem.url || mediaItem.filename);
      if (!limits.supportedFormats.includes(extension.toLowerCase())) {
        continue; // Skip unsupported formats
      }

      // Check file size (simplified - in real implementation, would check actual file size)
      const isVideo = this.isVideoFormat(extension);
      const sizeLimit = isVideo ? limits.videoLimit : limits.imageLimit;
      
      optimizedMedia.push({
        ...mediaItem,
        optimized: true,
        platform: platform
      });
    }

    return optimizedMedia;
  }

  /**
   * Optimize hashtags for platform best practices
   */
  async optimizeHashtags(hashtags, platform) {
    const platformBestPractices = {
      twitter: { max: 2, placement: 'inline' },
      linkedin: { max: 5, placement: 'end' },
      facebook: { max: 3, placement: 'end' },
      instagram: { max: 30, placement: 'end' },
      mastodon: { max: 5, placement: 'inline' }
    };

    const practices = platformBestPractices[platform] || { max: 5, placement: 'end' };
    return hashtags.slice(0, practices.max);
  }

  /**
   * Optimize mentions for platform syntax
   */
  async optimizeMentions(mentions, platform) {
    return mentions.map(mention => {
      switch (platform) {
        case 'twitter':
        case 'mastodon':
          return mention.startsWith('@') ? mention : `@${mention}`;
        case 'linkedin':
          // LinkedIn uses different mention format
          return mention;
        case 'facebook':
        case 'instagram':
          return mention.startsWith('@') ? mention : `@${mention}`;
        default:
          return mention;
      }
    });
  }

  /**
   * Twitter-specific optimizations
   */
  optimizeForTwitter(content) {
    // Add Twitter-specific optimizations
    let text = content.text;
    
    // Add hashtags inline if they fit
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagText = ' ' + content.hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      
      if ((text + hashtagText).length <= 280) {
        text += hashtagText;
      }
    }

    return {
      ...content,
      text,
      platform: 'twitter'
    };
  }

  /**
   * LinkedIn-specific optimizations
   */
  optimizeForLinkedIn(content) {
    let text = content.text;
    
    // LinkedIn prefers professional tone
    if (this.config.autoOptimizeContent) {
      text = this.makeProfessional(text);
    }
    
    // Add hashtags at the end
    if (content.hashtags && content.hashtags.length > 0) {
      text += '\n\n' + content.hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
    }

    return {
      ...content,
      text,
      platform: 'linkedin'
    };
  }

  /**
   * Facebook-specific optimizations
   */
  optimizeForFacebook(content) {
    let text = content.text;
    
    // Facebook allows longer content
    // Add hashtags at the end if present
    if (content.hashtags && content.hashtags.length > 0) {
      text += '\n\n' + content.hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
    }

    return {
      ...content,
      text,
      platform: 'facebook'
    };
  }

  /**
   * Instagram-specific optimizations
   */
  optimizeForInstagram(content) {
    let text = content.text;
    
    // Instagram is visual-first, ensure media is present
    if (!content.media || content.media.length === 0) {
      throw new Error('Instagram posts require media');
    }
    
    // Add hashtags at the end (Instagram allows many)
    if (content.hashtags && content.hashtags.length > 0) {
      text += '\n\n' + content.hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
    }

    return {
      ...content,
      text,
      platform: 'instagram'
    };
  }

  /**
   * Mastodon-specific optimizations
   */
  optimizeForMastodon(content) {
    let text = content.text;
    
    // Mastodon has content warnings and visibility options
    // Add hashtags inline
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagText = ' ' + content.hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      
      if ((text + hashtagText).length <= 500) {
        text += hashtagText;
      }
    }

    return {
      ...content,
      text,
      platform: 'mastodon',
      visibility: content.visibility || 'public'
    };
  }

  /**
   * Make text more professional for LinkedIn
   */
  makeProfessional(text) {
    // Simple transformations to make text more professional
    return text
      .replace(/\b(awesome|cool|amazing)\b/gi, 'excellent')
      .replace(/\b(guys|folks)\b/gi, 'everyone')
      .replace(/!/g, '.')
      .replace(/\.\.\./g, '.');
  }

  /**
   * Get file extension from URL or filename
   */
  getFileExtension(filename) {
    return filename.split('.').pop() || '';
  }

  /**
   * Check if format is video
   */
  isVideoFormat(extension) {
    const videoFormats = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'];
    return videoFormats.includes(extension.toLowerCase());
  }

  /**
   * Validate content for platform
   */
  validateContent(content, platform) {
    const limits = this.platformLimits[platform];
    const errors = [];

    // Check text length
    if (content.text && content.text.length > limits.textLimit) {
      errors.push(`Text exceeds ${platform} limit of ${limits.textLimit} characters`);
    }

    // Check media count
    if (content.media && content.media.length > limits.mediaLimit) {
      errors.push(`Media count exceeds ${platform} limit of ${limits.mediaLimit} items`);
    }

    // Platform-specific validations
    if (platform === 'instagram' && (!content.media || content.media.length === 0)) {
      errors.push('Instagram posts require at least one media item');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get platform recommendations
   */
  getPlatformRecommendations(platform) {
    const recommendations = {
      twitter: [
        'Keep text under 280 characters',
        'Use 1-2 relevant hashtags',
        'Include engaging visuals',
        'Post during peak hours (9 AM - 3 PM)'
      ],
      linkedin: [
        'Use professional tone',
        'Include industry-relevant hashtags',
        'Share valuable insights',
        'Post during business hours'
      ],
      facebook: [
        'Use engaging, conversational tone',
        'Include call-to-action',
        'Use high-quality images',
        'Post when audience is most active'
      ],
      instagram: [
        'Focus on high-quality visuals',
        'Use up to 30 relevant hashtags',
        'Include engaging captions',
        'Post consistently'
      ],
      mastodon: [
        'Be authentic and community-focused',
        'Use content warnings when appropriate',
        'Engage with local community',
        'Respect instance rules'
      ]
    };

    return recommendations[platform] || [];
  }
}
