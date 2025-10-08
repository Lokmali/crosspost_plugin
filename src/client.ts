import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface AuthConfig {
  nearSignature: string;
  accountId: string;
  baseUrl?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitsResponse {
  global: RateLimitInfo;
  endpoints: Record<string, RateLimitInfo>;
}

export interface EndpointRateLimitResponse {
  endpoint: string;
  limit: RateLimitInfo;
}

// ===== AUTH API INTERFACES =====

export interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  avatar?: string;
  isActive: boolean;
  connectedAt: string;
  lastUsedAt?: string;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  accountId: string;
  connectedAccounts: ConnectedAccount[];
  permissions: string[];
  expiresAt?: string;
}

export interface NearAuthorizationStatus {
  isAuthorized: boolean;
  accountId: string;
  permissions: string[];
  expiresAt?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  accountId: string;
  expiresAt?: string;
  message?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token: string;
  expiresAt: string;
}

export interface ProfileData {
  accountId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  connectedAccounts: ConnectedAccount[];
  stats: {
    totalPosts: number;
    totalLikes: number;
    totalReposts: number;
  };
}

// ===== POST API INTERFACES =====

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnail?: string;
  alt?: string;
  metadata?: Record<string, any>;
}

export interface PostContent {
  text: string;
  media?: MediaItem[];
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
}

export interface CreatePostRequest {
  content: PostContent;
  platforms: string[];
  scheduledAt?: string;
  visibility?: 'public' | 'followers' | 'private';
  replySettings?: 'everyone' | 'mentioned' | 'followers';
}

export interface Post {
  id: string;
  content: PostContent;
  author: {
    accountId: string;
    displayName: string;
    avatar?: string;
  };
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  createdAt: string;
  publishedAt?: string;
  scheduledAt?: string;
  visibility: 'public' | 'followers' | 'private';
  replySettings: 'everyone' | 'mentioned' | 'followers';
  stats: {
    likes: number;
    reposts: number;
    replies: number;
    views?: number;
  };
  engagement: {
    isLiked: boolean;
    isReposted: boolean;
    isBookmarked: boolean;
  };
}

export interface CreatePostResponse {
  success: boolean;
  post: Post;
  message?: string;
}

export interface RepostRequest {
  originalPostId: string;
  platforms: string[];
  comment?: string;
}

export interface QuotePostRequest {
  originalPostId: string;
  content: PostContent;
  platforms: string[];
}

export interface ReplyToPostRequest {
  originalPostId: string;
  content: PostContent;
  platforms: string[];
}

export interface LikePostRequest {
  postId: string;
  platforms: string[];
}

export interface DeletePostRequest {
  postId: string;
  platforms: string[];
}

// ===== ACTIVITY API INTERFACES =====

export interface LeaderboardEntry {
  rank: number;
  accountId: string;
  displayName: string;
  avatar?: string;
  score: number;
  stats: {
    posts: number;
    likes: number;
    reposts: number;
    replies: number;
  };
  change: {
    direction: 'up' | 'down' | 'same';
    value: number;
  };
}

export interface LeaderboardResponse {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: string;
}

export interface ActivityItem {
  id: string;
  type: 'post' | 'like' | 'repost' | 'reply' | 'follow' | 'mention';
  actor: {
    accountId: string;
    displayName: string;
    avatar?: string;
  };
  target?: {
    type: 'post' | 'user';
    id: string;
    content?: string;
  };
  content?: string;
  platforms: string[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AccountActivityResponse {
  accountId: string;
  activities: ActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    types?: string[];
    platforms?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export interface AccountPostsResponse {
  accountId: string;
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    platforms?: string[];
    status?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

// ===== MEDIA HANDLING INTERFACES =====

export interface MediaNormalizationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  quality?: number; // for images/videos
  thumbnailSize?: { width: number; height: number };
}

export interface NormalizedMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  data: string; // base64 encoded
  mimeType: string;
  size: number;
  thumbnail?: string; // base64 encoded thumbnail
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    originalName?: string;
  };
}

// ===== ERROR HANDLING INTERFACES =====

export interface CrosspostError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
  timestamp: string;
}

export interface RequestOverride {
  authToken?: string;
  accountId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ClientConfig {
  baseUrl: string;
  accountId: string;
  timeout?: number;
}

export class CrosspostPluginClient {
  private client: AxiosInstance;
  private authConfig: AuthConfig | null = null;
  private accountId: string;

  constructor(config: ClientConfig | string = 'https://api.opencrosspost.com/') {
    // Handle both string (legacy) and object config
    const clientConfig = typeof config === 'string' 
      ? { baseUrl: config, accountId: '' }
      : config;

    this.accountId = clientConfig.accountId;
    
    this.client = axios.create({
      baseURL: clientConfig.baseUrl,
      timeout: clientConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for NEAR auth
    this.client.interceptors.request.use((config) => {
      // For GET requests, use X-Near-Account header
      if (config.method === 'get') {
        config.headers['X-Near-Account'] = this.accountId;
      }
      
      // For POST/DELETE requests, use Authorization Bearer with NEAR signature
      if (config.method === 'post' || config.method === 'delete') {
        if (this.authConfig?.nearSignature) {
          config.headers.Authorization = `Bearer ${this.authConfig.nearSignature}`;
        }
        // Still include account ID for context
        config.headers['X-Near-Account'] = this.accountId;
      }
      
      return config;
    });
  }

  /**
   * Set NEAR authentication configuration
   */
  setAuth(config: AuthConfig): void {
    this.authConfig = config;
    this.accountId = config.accountId;
    
    if (config.baseUrl) {
      this.client.defaults.baseURL = config.baseUrl;
    }
  }

  /**
   * Set account ID for GET requests
   */
  setAccountId(accountId: string): void {
    this.accountId = accountId;
  }

  /**
   * Check plugin health status (GET request)
   */
  async health(): Promise<HealthResponse> {
    try {
      const response: AxiosResponse<HealthResponse> = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get current authentication status
   */
  isAuthenticated(): boolean {
    return this.authConfig !== null && !!this.authConfig.nearSignature && !!this.accountId;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authConfig = null;
  }

  /**
   * Get current account ID
   */
  getAccountId(): string {
    return this.accountId;
  }

  // ===== SYSTEM API =====

  /**
   * Get rate limits for all endpoints
   */
  async getRateLimits(): Promise<RateLimitsResponse> {
    try {
      const response: AxiosResponse<RateLimitsResponse> = await this.client.get('/api/rate-limits');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get rate limits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get rate limit for a specific endpoint
   */
  async getEndpointRateLimit(endpoint: string): Promise<EndpointRateLimitResponse> {
    try {
      const response: AxiosResponse<EndpointRateLimitResponse> = await this.client.get(`/api/rate-limits/${encodeURIComponent(endpoint)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get rate limit for endpoint ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== AUTH API =====

  /**
   * Authorize NEAR account with signature
   */
  async authorizeNearAccount(signature: string, accountId: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.client.post('/api/auth/authorize-near', {
        signature,
        accountId
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to authorize NEAR account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get NEAR authorization status
   */
  async getNearAuthorizationStatus(): Promise<NearAuthorizationStatus> {
    try {
      const response: AxiosResponse<NearAuthorizationStatus> = await this.client.get('/api/auth/near-status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get NEAR authorization status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Login to platform
   */
  async loginToPlatform(platform: string, credentials: Record<string, any>): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.client.post('/api/auth/login', {
        platform,
        credentials
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to login to platform ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const response: AxiosResponse<RefreshTokenResponse> = await this.client.post('/api/auth/refresh');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh user profile data
   */
  async refreshProfile(): Promise<ProfileData> {
    try {
      const response: AxiosResponse<ProfileData> = await this.client.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get authentication status
   */
  async getAuthStatus(): Promise<AuthStatus> {
    try {
      const response: AxiosResponse<AuthStatus> = await this.client.get('/api/auth/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get auth status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke authentication
   */
  async revokeAuth(): Promise<{ success: boolean; message?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; message?: string }> = await this.client.post('/api/auth/revoke');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to revoke auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get connected accounts
   */
  async getConnectedAccounts(): Promise<ConnectedAccount[]> {
    try {
      const response: AxiosResponse<ConnectedAccount[]> = await this.client.get('/api/auth/connected-accounts');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get connected accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== POST API =====

  /**
   * Create a new post
   */
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    try {
      const response: AxiosResponse<CreatePostResponse> = await this.client.post('/api/posts', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Repost an existing post
   */
  async repost(request: RepostRequest): Promise<CreatePostResponse> {
    try {
      const response: AxiosResponse<CreatePostResponse> = await this.client.post('/api/posts/repost', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to repost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Quote post (repost with comment)
   */
  async quotePost(request: QuotePostRequest): Promise<CreatePostResponse> {
    try {
      const response: AxiosResponse<CreatePostResponse> = await this.client.post('/api/posts/quote', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to quote post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reply to a post
   */
  async replyToPost(request: ReplyToPostRequest): Promise<CreatePostResponse> {
    try {
      const response: AxiosResponse<CreatePostResponse> = await this.client.post('/api/posts/reply', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to reply to post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Like a post
   */
  async likePost(request: LikePostRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; message?: string }> = await this.client.post('/api/posts/like', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to like post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(request: LikePostRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; message?: string }> = await this.client.post('/api/posts/unlike', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to unlike post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a post
   */
  async deletePost(request: DeletePostRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; message?: string }> = await this.client.delete('/api/posts', { data: request });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== ACTIVITY API =====

  /**
   * Get leaderboard
   */
  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly', limit: number = 50): Promise<LeaderboardResponse> {
    try {
      const response: AxiosResponse<LeaderboardResponse> = await this.client.get('/api/activity/leaderboard', {
        params: { period, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account activity
   */
  async getAccountActivity(
    accountId: string,
    options: {
      page?: number;
      limit?: number;
      types?: string[];
      platforms?: string[];
      dateRange?: { start: string; end: string };
    } = {}
  ): Promise<AccountActivityResponse> {
    try {
      const response: AxiosResponse<AccountActivityResponse> = await this.client.get(`/api/activity/account/${accountId}`, {
        params: options
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account posts
   */
  async getAccountPosts(
    accountId: string,
    options: {
      page?: number;
      limit?: number;
      platforms?: string[];
      status?: string[];
      dateRange?: { start: string; end: string };
    } = {}
  ): Promise<AccountPostsResponse> {
    try {
      const response: AxiosResponse<AccountPostsResponse> = await this.client.get(`/api/activity/account/${accountId}/posts`, {
        params: options
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== MEDIA HANDLING =====

  /**
   * Normalize media from various sources (Blob, File, URL, base64)
   */
  async normalizeMedia(
    media: Blob | File | string | ArrayBuffer,
    options: MediaNormalizationOptions = {}
  ): Promise<NormalizedMedia> {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav'],
      quality = 0.8,
      thumbnailSize = { width: 300, height: 300 }
    } = options;

    try {
      let data: string;
      let mimeType: string;
      let size: number;
      let metadata: NormalizedMedia['metadata'] = {};

      if (typeof media === 'string') {
        // Handle URL or base64 string
        if (media.startsWith('data:')) {
          // Base64 data URL
          const [header, base64Data] = media.split(',');
          mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
          data = base64Data;
          size = Math.floor(base64Data.length * 0.75); // Approximate size
        } else {
          // URL - fetch and convert
          const response = await fetch(media);
          const blob = await response.blob();
          mimeType = blob.type;
          size = blob.size;
          data = await this.blobToBase64(blob);
        }
      } else if (media instanceof Blob || media instanceof File) {
        // Handle Blob or File
        mimeType = media.type;
        size = media.size;
        data = await this.blobToBase64(media);
        
        if (media instanceof File) {
          metadata.originalName = media.name;
        }
      } else if (media instanceof ArrayBuffer) {
        // Handle ArrayBuffer
        const blob = new Blob([media]);
        mimeType = blob.type;
        size = blob.size;
        data = await this.blobToBase64(blob);
      } else {
        throw new Error('Unsupported media type');
      }

      // Validate size
      if (size > maxSize) {
        throw new Error(`Media size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
      }

      // Validate type
      if (!allowedTypes.includes(mimeType)) {
        throw new Error(`Media type ${mimeType} is not allowed`);
      }

      // Determine media type category
      let type: NormalizedMedia['type'];
      if (mimeType.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.startsWith('audio/')) {
        type = 'audio';
      } else {
        type = 'document';
      }

      // Generate thumbnail for images and videos
      let thumbnail: string | undefined;
      if (type === 'image' || type === 'video') {
        try {
          thumbnail = await this.generateThumbnail(data, mimeType, thumbnailSize);
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error);
        }
      }

      return {
        type,
        data,
        mimeType,
        size,
        thumbnail,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to normalize media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:type;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate thumbnail for media
   */
  private async generateThumbnail(
    base64Data: string,
    mimeType: string,
    size: { width: number; height: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate thumbnail dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let { width, height } = size;
        
        if (aspectRatio > 1) {
          height = width / aspectRatio;
        } else {
          width = height * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail.split(',')[1]); // Remove data:type;base64, prefix
      };
      
      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = `data:${mimeType};base64,${base64Data}`;
    });
  }

  // ===== ERROR HANDLING & REQUEST OVERRIDES =====

  /**
   * Create a request with per-request overrides
   */
  private createRequestWithOverrides(override?: RequestOverride) {
    const client = axios.create({
      baseURL: this.client.defaults.baseURL,
      timeout: override?.timeout || this.client.defaults.timeout,
      headers: {
        ...this.client.defaults.headers,
        ...override?.headers,
      },
    });

    // Add request interceptor for overrides
    client.interceptors.request.use((config) => {
      // For GET requests, use X-Near-Account header
      if (config.method === 'get') {
        config.headers['X-Near-Account'] = override?.accountId || this.accountId;
      }
      
      // For POST/DELETE requests, use Authorization Bearer with NEAR signature
      if (config.method === 'post' || config.method === 'delete') {
        if (override?.authToken) {
          config.headers.Authorization = `Bearer ${override.authToken}`;
        } else if (this.authConfig?.nearSignature) {
          config.headers.Authorization = `Bearer ${this.authConfig.nearSignature}`;
        }
        // Still include account ID for context
        config.headers['X-Near-Account'] = override?.accountId || this.accountId;
      }
      
      return config;
    });

    return client;
  }

  /**
   * Map API errors to consistent CrosspostError format
   */
  private mapError(error: any): CrosspostError {
    const timestamp = new Date().toISOString();
    
    if (error.response) {
      // API responded with error status
      const { status, data } = error.response;
      return {
        code: data?.code || `HTTP_${status}`,
        message: data?.message || error.message || `HTTP ${status} Error`,
        details: data?.details || { status, url: error.config?.url },
        statusCode: status,
        timestamp,
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        details: { url: error.config?.url },
        timestamp,
      };
    } else {
      // Other error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
        timestamp,
      };
    }
  }

  /**
   * Execute request with error mapping and optional overrides
   */
  private async executeRequest<T>(
    requestFn: (client: AxiosInstance) => Promise<AxiosResponse<T>>,
    override?: RequestOverride
  ): Promise<T> {
    try {
      const client = override ? this.createRequestWithOverrides(override) : this.client;
      const response = await requestFn(client);
      return response.data;
    } catch (error) {
      const crosspostError = this.mapError(error);
      throw crosspostError;
    }
  }

  /**
   * Health check with overrides
   */
  async healthWithOverrides(override?: RequestOverride): Promise<HealthResponse> {
    return this.executeRequest(
      (client) => client.get('/health'),
      override
    );
  }

  /**
   * Create post with overrides
   */
  async createPostWithOverrides(
    request: CreatePostRequest,
    override?: RequestOverride
  ): Promise<CreatePostResponse> {
    return this.executeRequest(
      (client) => client.post('/api/posts', request),
      override
    );
  }

  /**
   * Get rate limits with overrides
   */
  async getRateLimitsWithOverrides(override?: RequestOverride): Promise<RateLimitsResponse> {
    return this.executeRequest(
      (client) => client.get('/api/rate-limits'),
      override
    );
  }
}
