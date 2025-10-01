/**
 * Authentication Manager
 * Handles OAuth flows and token management for different platforms
 */

import crypto from 'crypto';

export class AuthManager {
  constructor(config) {
    this.config = config;
    this.tokens = new Map();
    this.refreshTokens = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    // Load stored tokens if available
    await this.loadStoredTokens();
    this.isInitialized = true;
  }

  /**
   * Authenticate with a platform using OAuth2
   */
  async authenticate(platform, credentials) {
    if (!this.isInitialized) {
      throw new Error('AuthManager not initialized');
    }

    try {
      switch (platform) {
        case 'twitter':
          return await this.authenticateTwitter(credentials);
        case 'linkedin':
          return await this.authenticateLinkedIn(credentials);
        case 'facebook':
          return await this.authenticateFacebook(credentials);
        case 'instagram':
          return await this.authenticateInstagram(credentials);
        case 'mastodon':
          return await this.authenticateMastodon(credentials);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      throw new Error(`Authentication failed for ${platform}: ${error.message}`);
    }
  }

  /**
   * Twitter OAuth2 Authentication
   */
  async authenticateTwitter(credentials) {
    const { clientId, clientSecret, code, redirectUri } = credentials;
    
    if (!clientId || !clientSecret) {
      throw new Error('Twitter client ID and secret required');
    }

    if (code) {
      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken('twitter', {
        clientId,
        clientSecret,
        code,
        redirectUri
      });

      this.tokens.set('twitter', tokenResponse.access_token);
      if (tokenResponse.refresh_token) {
        this.refreshTokens.set('twitter', tokenResponse.refresh_token);
      }

      await this.saveTokens();

      return {
        success: true,
        platform: 'twitter',
        accessToken: tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in
      };
    } else {
      // Generate authorization URL
      const state = crypto.randomBytes(16).toString('hex');
      const codeChallenge = this.generateCodeChallenge();
      
      const authUrl = this.buildAuthUrl('twitter', {
        clientId,
        redirectUri,
        state,
        codeChallenge
      });

      return {
        success: false,
        authUrl,
        state,
        message: 'Visit the auth URL to complete authentication'
      };
    }
  }

  /**
   * LinkedIn OAuth2 Authentication
   */
  async authenticateLinkedIn(credentials) {
    const { clientId, clientSecret, code, redirectUri } = credentials;
    
    if (!clientId || !clientSecret) {
      throw new Error('LinkedIn client ID and secret required');
    }

    if (code) {
      const tokenResponse = await this.exchangeCodeForToken('linkedin', {
        clientId,
        clientSecret,
        code,
        redirectUri
      });

      this.tokens.set('linkedin', tokenResponse.access_token);
      if (tokenResponse.refresh_token) {
        this.refreshTokens.set('linkedin', tokenResponse.refresh_token);
      }

      await this.saveTokens();

      return {
        success: true,
        platform: 'linkedin',
        accessToken: tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in
      };
    } else {
      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = this.buildAuthUrl('linkedin', {
        clientId,
        redirectUri,
        state
      });

      return {
        success: false,
        authUrl,
        state,
        message: 'Visit the auth URL to complete authentication'
      };
    }
  }

  /**
   * Facebook OAuth2 Authentication
   */
  async authenticateFacebook(credentials) {
    const { appId, appSecret, code, redirectUri } = credentials;
    
    if (!appId || !appSecret) {
      throw new Error('Facebook app ID and secret required');
    }

    if (code) {
      const tokenResponse = await this.exchangeCodeForToken('facebook', {
        clientId: appId,
        clientSecret: appSecret,
        code,
        redirectUri
      });

      this.tokens.set('facebook', tokenResponse.access_token);
      await this.saveTokens();

      return {
        success: true,
        platform: 'facebook',
        accessToken: tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in
      };
    } else {
      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = this.buildAuthUrl('facebook', {
        clientId: appId,
        redirectUri,
        state
      });

      return {
        success: false,
        authUrl,
        state,
        message: 'Visit the auth URL to complete authentication'
      };
    }
  }

  /**
   * Instagram OAuth2 Authentication (uses Facebook auth)
   */
  async authenticateInstagram(credentials) {
    // Instagram uses Facebook's OAuth system
    const result = await this.authenticateFacebook(credentials);
    if (result.success) {
      result.platform = 'instagram';
      this.tokens.set('instagram', result.accessToken);
    }
    return result;
  }

  /**
   * Mastodon OAuth2 Authentication
   */
  async authenticateMastodon(credentials) {
    const { clientId, clientSecret, code, redirectUri, instance } = credentials;
    
    if (!clientId || !clientSecret || !instance) {
      throw new Error('Mastodon client ID, secret, and instance required');
    }

    if (code) {
      const tokenResponse = await this.exchangeCodeForToken('mastodon', {
        clientId,
        clientSecret,
        code,
        redirectUri,
        instance
      });

      this.tokens.set('mastodon', tokenResponse.access_token);
      await this.saveTokens();

      return {
        success: true,
        platform: 'mastodon',
        accessToken: tokenResponse.access_token
      };
    } else {
      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = this.buildAuthUrl('mastodon', {
        clientId,
        redirectUri,
        state,
        instance
      });

      return {
        success: false,
        authUrl,
        state,
        message: 'Visit the auth URL to complete authentication'
      };
    }
  }

  /**
   * Build authorization URL for OAuth2 flow
   */
  buildAuthUrl(platform, params) {
    const baseUrls = {
      twitter: 'https://twitter.com/i/oauth2/authorize',
      linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
      facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
      mastodon: `${params.instance}/oauth/authorize`
    };

    const scopes = {
      twitter: 'tweet.read tweet.write users.read',
      linkedin: 'r_liteprofile r_emailaddress w_member_social',
      facebook: 'pages_manage_posts pages_read_engagement',
      mastodon: 'read write'
    };

    const url = new URL(baseUrls[platform]);
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', scopes[platform]);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', params.state);

    if (platform === 'twitter' && params.codeChallenge) {
      url.searchParams.set('code_challenge', params.codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }

    return url.toString();
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(platform, params) {
    const tokenUrls = {
      twitter: 'https://api.twitter.com/2/oauth2/token',
      linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
      facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
      mastodon: `${params.instance}/oauth/token`
    };

    const payload = {
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri
    };

    // Mock response for demonstration
    return {
      access_token: `mock_token_${platform}_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: platform !== 'facebook' ? `refresh_${platform}_${Date.now()}` : undefined
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(platform) {
    const refreshToken = this.refreshTokens.get(platform);
    if (!refreshToken) {
      throw new Error(`No refresh token available for ${platform}`);
    }

    // Implementation would make actual API call to refresh token
    const newToken = `refreshed_token_${platform}_${Date.now()}`;
    this.tokens.set(platform, newToken);
    await this.saveTokens();

    return newToken;
  }

  /**
   * Get access token for a platform
   */
  getAccessToken(platform) {
    return this.tokens.get(platform);
  }

  /**
   * Check if platform is authenticated
   */
  isAuthenticated(platform) {
    return this.tokens.has(platform);
  }

  /**
   * Get authentication status for multiple platforms
   */
  async getAuthStatus(platforms) {
    const status = {};
    
    for (const platform of platforms) {
      status[platform] = {
        authenticated: this.isAuthenticated(platform),
        hasToken: this.tokens.has(platform),
        hasRefreshToken: this.refreshTokens.has(platform)
      };
    }

    return status;
  }

  /**
   * Revoke authentication for a platform
   */
  async revokeAuth(platform) {
    this.tokens.delete(platform);
    this.refreshTokens.delete(platform);
    await this.saveTokens();
  }

  /**
   * Generate PKCE code challenge for Twitter OAuth2
   */
  generateCodeChallenge() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return codeChallenge;
  }

  /**
   * Load stored tokens (in real implementation, this would use secure storage)
   */
  async loadStoredTokens() {
    // Mock implementation - in real app, load from secure storage
    // this.tokens = new Map(JSON.parse(localStorage.getItem('crosspost_tokens') || '[]'));
    // this.refreshTokens = new Map(JSON.parse(localStorage.getItem('crosspost_refresh_tokens') || '[]'));
  }

  /**
   * Save tokens to storage
   */
  async saveTokens() {
    // Mock implementation - in real app, save to secure storage
    // localStorage.setItem('crosspost_tokens', JSON.stringify([...this.tokens]));
    // localStorage.setItem('crosspost_refresh_tokens', JSON.stringify([...this.refreshTokens]));
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    this.tokens.clear();
    this.refreshTokens.clear();
    this.isInitialized = false;
  }
}
