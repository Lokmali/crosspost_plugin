/**
 * Authentication Manager
 * Handles OAuth flows and token management for different platforms
 */

import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class AuthManager {
  constructor(config) {
    this.config = config;
    this.tokens = new Map();
    this.refreshTokens = new Map();
    this.tokenExpiry = new Map();
    this.codeVerifiers = new Map(); // For PKCE
    this.isInitialized = false;
    this.storageDir = config.storageDir || '.crosspost-tokens';
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
      const { codeChallenge, codeVerifier } = this.generateCodeChallenge();
      
      // Store code verifier for later use
      this.codeVerifiers.set(state, codeVerifier);
      
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
        codeVerifier, // Include for debugging/testing
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

    const url = tokenUrls[platform];
    if (!url) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
      let requestData;
      let headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };

      if (platform === 'twitter') {
        // Twitter uses PKCE and basic auth
        const codeVerifier = this.codeVerifiers.get(params.state) || this.generateCodeVerifier();
        
        requestData = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: params.clientId,
          code: params.code,
          redirect_uri: params.redirectUri,
          code_verifier: codeVerifier
        });

        headers['Authorization'] = `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')}`;
      } else if (platform === 'linkedin') {
        requestData = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: params.clientId,
          client_secret: params.clientSecret,
          code: params.code,
          redirect_uri: params.redirectUri
        });
      } else if (platform === 'facebook') {
        requestData = new URLSearchParams({
          client_id: params.clientId,
          client_secret: params.clientSecret,
          code: params.code,
          redirect_uri: params.redirectUri
        });
      } else if (platform === 'mastodon') {
        requestData = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: params.clientId,
          client_secret: params.clientSecret,
          code: params.code,
          redirect_uri: params.redirectUri
        });
      }

      const response = await axios.post(url, requestData, { headers });
      
      // Store token expiry
      if (response.data.expires_in) {
        const expiryTime = Date.now() + (response.data.expires_in * 1000);
        this.tokenExpiry.set(platform, expiryTime);
      }

      return response.data;
    } catch (error) {
      console.error(`Token exchange failed for ${platform}:`, error.response?.data || error.message);
      throw new Error(`Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(platform) {
    const refreshToken = this.refreshTokens.get(platform);
    if (!refreshToken) {
      throw new Error(`No refresh token available for ${platform}`);
    }

    const tokenUrls = {
      twitter: 'https://api.twitter.com/2/oauth2/token',
      linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
      mastodon: `${this.config.mastodonInstance || 'https://mastodon.social'}/oauth/token`
    };

    const url = tokenUrls[platform];
    if (!url) {
      throw new Error(`Token refresh not supported for ${platform}`);
    }

    try {
      let requestData;
      let headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };

      if (platform === 'twitter') {
        const clientCredentials = Buffer.from(`${this.config.twitter?.clientId}:${this.config.twitter?.clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${clientCredentials}`;
        
        requestData = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });
      } else if (platform === 'linkedin') {
        requestData = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.linkedin?.clientId,
          client_secret: this.config.linkedin?.clientSecret
        });
      } else if (platform === 'mastodon') {
        requestData = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.mastodon?.clientId,
          client_secret: this.config.mastodon?.clientSecret
        });
      }

      const response = await axios.post(url, requestData, { headers });
      
      // Update stored tokens
      this.tokens.set(platform, response.data.access_token);
      if (response.data.refresh_token) {
        this.refreshTokens.set(platform, response.data.refresh_token);
      }
      
      // Update token expiry
      if (response.data.expires_in) {
        const expiryTime = Date.now() + (response.data.expires_in * 1000);
        this.tokenExpiry.set(platform, expiryTime);
      }

      await this.saveTokens();
      return response.data.access_token;
    } catch (error) {
      console.error(`Token refresh failed for ${platform}:`, error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get access token for a platform
   */
  async getAccessToken(platform) {
    const token = this.tokens.get(platform);
    if (!token) {
      return null;
    }

    // Check if token is expired and refresh if needed
    const expiry = this.tokenExpiry.get(platform);
    if (expiry && Date.now() >= expiry - 300000) { // Refresh 5 minutes before expiry
      try {
        console.log(`Token for ${platform} is expiring soon, refreshing...`);
        return await this.refreshAccessToken(platform);
      } catch (error) {
        console.warn(`Failed to refresh token for ${platform}:`, error.message);
        return token; // Return existing token as fallback
      }
    }

    return token;
  }

  /**
   * Get access token synchronously (without refresh)
   */
  getAccessTokenSync(platform) {
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
   * Generate PKCE code verifier
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge for Twitter OAuth2
   */
  generateCodeChallenge(codeVerifier) {
    if (!codeVerifier) {
      codeVerifier = this.generateCodeVerifier();
    }
    
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeChallenge, codeVerifier };
  }

  /**
   * Load stored tokens from secure storage
   */
  async loadStoredTokens() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      
      const tokenFile = path.join(this.storageDir, 'tokens.json');
      const refreshTokenFile = path.join(this.storageDir, 'refresh-tokens.json');
      const expiryFile = path.join(this.storageDir, 'token-expiry.json');

      try {
        const tokensData = await fs.readFile(tokenFile, 'utf8');
        const decryptedTokens = this.decrypt(tokensData);
        this.tokens = new Map(JSON.parse(decryptedTokens));
      } catch (error) {
        // File doesn't exist or can't be read, start with empty tokens
        this.tokens = new Map();
      }

      try {
        const refreshTokensData = await fs.readFile(refreshTokenFile, 'utf8');
        const decryptedRefreshTokens = this.decrypt(refreshTokensData);
        this.refreshTokens = new Map(JSON.parse(decryptedRefreshTokens));
      } catch (error) {
        this.refreshTokens = new Map();
      }

      try {
        const expiryData = await fs.readFile(expiryFile, 'utf8');
        this.tokenExpiry = new Map(JSON.parse(expiryData));
      } catch (error) {
        this.tokenExpiry = new Map();
      }
    } catch (error) {
      console.warn('Failed to load stored tokens:', error.message);
      this.tokens = new Map();
      this.refreshTokens = new Map();
      this.tokenExpiry = new Map();
    }
  }

  /**
   * Save tokens to secure storage
   */
  async saveTokens() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      
      const tokenFile = path.join(this.storageDir, 'tokens.json');
      const refreshTokenFile = path.join(this.storageDir, 'refresh-tokens.json');
      const expiryFile = path.join(this.storageDir, 'token-expiry.json');

      // Encrypt and save tokens
      const tokensJson = JSON.stringify([...this.tokens]);
      const encryptedTokens = this.encrypt(tokensJson);
      await fs.writeFile(tokenFile, encryptedTokens, 'utf8');

      // Encrypt and save refresh tokens
      const refreshTokensJson = JSON.stringify([...this.refreshTokens]);
      const encryptedRefreshTokens = this.encrypt(refreshTokensJson);
      await fs.writeFile(refreshTokenFile, encryptedRefreshTokens, 'utf8');

      // Save token expiry (not encrypted as it's not sensitive)
      const expiryJson = JSON.stringify([...this.tokenExpiry]);
      await fs.writeFile(expiryFile, expiryJson, 'utf8');
    } catch (error) {
      console.error('Failed to save tokens:', error.message);
      throw new Error('Failed to save authentication tokens');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('crosspost-plugin'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex')
    });
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const data = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('crosspost-plugin'));
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get encryption key from config or environment
   */
  getEncryptionKey() {
    const key = this.config.encryptionKey || 
                process.env.CROSSPOST_ENCRYPTION_KEY || 
                'default-key-change-in-production';
    
    if (key === 'default-key-change-in-production') {
      console.warn('Using default encryption key. Set CROSSPOST_ENCRYPTION_KEY environment variable for production.');
    }
    
    return crypto.createHash('sha256').update(key).digest();
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
