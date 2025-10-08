export { 
  CrosspostPluginClient, 
  type AuthConfig, 
  type HealthResponse, 
  type ClientConfig,
  type RateLimitInfo,
  type RateLimitsResponse,
  type EndpointRateLimitResponse,
  type ConnectedAccount,
  type AuthStatus,
  type NearAuthorizationStatus,
  type LoginResponse,
  type RefreshTokenResponse,
  type ProfileData,
  type MediaItem,
  type PostContent,
  type CreatePostRequest,
  type Post,
  type CreatePostResponse,
  type RepostRequest,
  type QuotePostRequest,
  type ReplyToPostRequest,
  type LikePostRequest,
  type DeletePostRequest,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type ActivityItem,
  type AccountActivityResponse,
  type AccountPostsResponse,
  type MediaNormalizationOptions,
  type NormalizedMedia,
  type CrosspostError,
  type RequestOverride
} from './client';

// Plugin configuration interface
export interface CrosspostPluginConfig {
  name: string;
  version: string;
  description: string;
}

// Default plugin configuration
export const pluginConfig: CrosspostPluginConfig = {
  name: 'crosspost-plugin',
  version: '1.0.0',
  description: 'Crosspost plugin for content distribution',
};

// Plugin initialization function
export function initializePlugin(config?: Partial<CrosspostPluginConfig>): CrosspostPluginClient {
  const finalConfig = { ...pluginConfig, ...config };
  console.log(`Initializing ${finalConfig.name} v${finalConfig.version}`);
  
  return new CrosspostPluginClient();
}

// Default export for module federation
export default {
  CrosspostPluginClient,
  initializePlugin,
  pluginConfig,
};
