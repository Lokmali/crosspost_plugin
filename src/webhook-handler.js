/**
 * Webhook Handler
 * Handles incoming webhooks from social media platforms
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class WebhookHandler extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.webhookSecrets = {
      twitter: config.twitter?.webhookSecret || process.env.TWITTER_WEBHOOK_SECRET,
      facebook: config.facebook?.webhookSecret || process.env.FACEBOOK_WEBHOOK_SECRET,
      instagram: config.instagram?.webhookSecret || process.env.INSTAGRAM_WEBHOOK_SECRET,
      linkedin: config.linkedin?.webhookSecret || process.env.LINKEDIN_WEBHOOK_SECRET
    };
    this.handlers = new Map();
    this.setupDefaultHandlers();
  }

  /**
   * Set up default event handlers
   */
  setupDefaultHandlers() {
    // Twitter webhook events
    this.on('twitter:tweet_create_events', (data) => {
      console.log('Twitter tweet created:', data);
    });

    this.on('twitter:favorite_events', (data) => {
      console.log('Twitter tweet liked:', data);
    });

    this.on('twitter:follow_events', (data) => {
      console.log('Twitter follow event:', data);
    });

    // Facebook webhook events
    this.on('facebook:feed', (data) => {
      console.log('Facebook feed event:', data);
    });

    this.on('facebook:mention', (data) => {
      console.log('Facebook mention:', data);
    });

    // Instagram webhook events
    this.on('instagram:comments', (data) => {
      console.log('Instagram comment:', data);
    });

    this.on('instagram:mentions', (data) => {
      console.log('Instagram mention:', data);
    });

    // LinkedIn webhook events
    this.on('linkedin:share', (data) => {
      console.log('LinkedIn share event:', data);
    });
  }

  /**
   * Handle Twitter webhook
   */
  async handleTwitterWebhook(req, res) {
    try {
      // Verify webhook signature
      if (!this.verifyTwitterSignature(req)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const body = req.body;

      // Handle different Twitter events
      if (body.tweet_create_events) {
        this.emit('twitter:tweet_create_events', body.tweet_create_events);
      }

      if (body.favorite_events) {
        this.emit('twitter:favorite_events', body.favorite_events);
      }

      if (body.follow_events) {
        this.emit('twitter:follow_events', body.follow_events);
      }

      if (body.direct_message_events) {
        this.emit('twitter:direct_message_events', body.direct_message_events);
      }

      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Twitter webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle Facebook/Instagram webhook
   */
  async handleFacebookWebhook(req, res) {
    try {
      // Handle verification challenge
      if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === this.config.facebook?.verifyToken) {
          res.status(200).send(challenge);
          return;
        } else {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
      }

      // Verify webhook signature
      if (!this.verifyFacebookSignature(req)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const body = req.body;

      // Process each entry
      if (body.entry) {
        for (const entry of body.entry) {
          // Facebook Page events
          if (entry.changes) {
            for (const change of entry.changes) {
              this.emit(`facebook:${change.field}`, {
                pageId: entry.id,
                change: change
              });
            }
          }

          // Instagram events
          if (entry.messaging) {
            for (const message of entry.messaging) {
              this.emit('instagram:message', {
                pageId: entry.id,
                message: message
              });
            }
          }
        }
      }

      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Facebook webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle LinkedIn webhook
   */
  async handleLinkedInWebhook(req, res) {
    try {
      // Verify webhook signature
      if (!this.verifyLinkedInSignature(req)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const body = req.body;

      // Handle LinkedIn events
      if (body.eventType) {
        this.emit(`linkedin:${body.eventType}`, body);
      }

      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('LinkedIn webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify Twitter webhook signature
   */
  verifyTwitterSignature(req) {
    const signature = req.headers['x-twitter-webhooks-signature'];
    const secret = this.webhookSecrets.twitter;

    if (!signature || !secret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('base64');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Verify Facebook webhook signature
   */
  verifyFacebookSignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    const secret = this.webhookSecrets.facebook;

    if (!signature || !secret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Verify LinkedIn webhook signature
   */
  verifyLinkedInSignature(req) {
    const signature = req.headers['linkedin-signature'];
    const secret = this.webhookSecrets.linkedin;

    if (!signature || !secret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Register custom webhook handler
   */
  registerHandler(platform, event, handler) {
    const eventName = `${platform}:${event}`;
    this.on(eventName, handler);
  }

  /**
   * Unregister webhook handler
   */
  unregisterHandler(platform, event, handler) {
    const eventName = `${platform}:${event}`;
    this.off(eventName, handler);
  }

  /**
   * Get webhook URL for platform
   */
  getWebhookUrl(platform, baseUrl) {
    const webhookPaths = {
      twitter: '/webhooks/twitter',
      facebook: '/webhooks/facebook',
      instagram: '/webhooks/facebook', // Instagram uses Facebook webhooks
      linkedin: '/webhooks/linkedin'
    };

    const path = webhookPaths[platform];
    if (!path) {
      throw new Error(`Webhook not supported for platform: ${platform}`);
    }

    return `${baseUrl}${path}`;
  }

  /**
   * Create Express.js middleware for handling webhooks
   */
  createExpressMiddleware() {
    return {
      twitter: (req, res) => this.handleTwitterWebhook(req, res),
      facebook: (req, res) => this.handleFacebookWebhook(req, res),
      linkedin: (req, res) => this.handleLinkedInWebhook(req, res)
    };
  }

  /**
   * Process webhook event and extract useful information
   */
  processWebhookEvent(platform, eventType, data) {
    const processed = {
      platform,
      eventType,
      timestamp: new Date(),
      data
    };

    switch (platform) {
      case 'twitter':
        processed.processed = this.processTwitterEvent(eventType, data);
        break;
      case 'facebook':
        processed.processed = this.processFacebookEvent(eventType, data);
        break;
      case 'instagram':
        processed.processed = this.processInstagramEvent(eventType, data);
        break;
      case 'linkedin':
        processed.processed = this.processLinkedInEvent(eventType, data);
        break;
    }

    return processed;
  }

  /**
   * Process Twitter webhook event
   */
  processTwitterEvent(eventType, data) {
    switch (eventType) {
      case 'tweet_create_events':
        return {
          type: 'tweet_created',
          tweetId: data[0]?.id_str,
          userId: data[0]?.user?.id_str,
          text: data[0]?.text,
          createdAt: data[0]?.created_at
        };
      case 'favorite_events':
        return {
          type: 'tweet_liked',
          tweetId: data[0]?.favorited_status?.id_str,
          userId: data[0]?.user?.id_str,
          createdAt: data[0]?.created_at
        };
      default:
        return { type: eventType, data };
    }
  }

  /**
   * Process Facebook webhook event
   */
  processFacebookEvent(eventType, data) {
    switch (eventType) {
      case 'feed':
        return {
          type: 'post_activity',
          postId: data.change?.value?.post_id,
          verb: data.change?.value?.verb,
          createdTime: data.change?.value?.created_time
        };
      default:
        return { type: eventType, data };
    }
  }

  /**
   * Process Instagram webhook event
   */
  processInstagramEvent(eventType, data) {
    switch (eventType) {
      case 'comments':
        return {
          type: 'comment_added',
          mediaId: data.change?.value?.media_id,
          commentId: data.change?.value?.id,
          text: data.change?.value?.text
        };
      default:
        return { type: eventType, data };
    }
  }

  /**
   * Process LinkedIn webhook event
   */
  processLinkedInEvent(eventType, data) {
    switch (eventType) {
      case 'SHARE':
        return {
          type: 'share_activity',
          shareId: data.shareId,
          activity: data.activity
        };
      default:
        return { type: eventType, data };
    }
  }

  /**
   * Get webhook statistics
   */
  getStats() {
    return {
      registeredEvents: this.eventNames(),
      listenerCounts: this.eventNames().reduce((acc, event) => {
        acc[event] = this.listenerCount(event);
        return acc;
      }, {}),
      maxListeners: this.getMaxListeners()
    };
  }
}


