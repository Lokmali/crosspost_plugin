# Crosspost Plugin

A TypeScript plugin for the OpenCrosspost API with NEAR authentication support.

## Features

- ✅ NEAR signature authentication for POST/DELETE requests
- ✅ Account ID header for GET requests  
- ✅ Module Federation support for runtime loading
- ✅ TypeScript support with full type definitions
- ✅ Configurable timeouts and base URLs
- ✅ Health check endpoint

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```
- Serves plugin on `http://localhost:3999/remoteEntry.js`
- Exposes `./plugin` for Module Federation

### 3. Build for Production
```bash
npm run build
```
- Outputs to `dist/` folder
- Generates TypeScript declarations

## Usage

### Direct Import
```typescript
import { CrosspostPluginClient } from './crosspost-plugin/dist/index.js';

const client = new CrosspostPluginClient({
  baseUrl: 'https://api.opencrosspost.com/',
  accountId: 'your.near',
  timeout: 30000
});

// For GET requests (health check)
const health = await client.health();
console.log(health);

// For POST/DELETE requests, set NEAR signature
client.setAuth({
  nearSignature: 'YOUR_NEAR_SIGNATURE_TOKEN',
  accountId: 'your.near'
});
```

### Module Federation (Runtime Loading)
```typescript
// In your host app's rspack.config.cjs
new ModuleFederationPlugin({
  remotes: {
    crosspost_plugin: 'crosspost_plugin@http://localhost:3999/remoteEntry.js',
  },
});

// In your app code
const { CrosspostPluginClient } = await import('crosspost_plugin/plugin');

const client = new CrosspostPluginClient({
  baseUrl: 'https://api.opencrosspost.com/',
  accountId: 'your.near'
});

const health = await client.health();
```

## API Reference

### CrosspostPluginClient

#### Constructor
```typescript
new CrosspostPluginClient(config: ClientConfig | string)
```

#### Methods
- `setAuth(config: AuthConfig)` - Set NEAR signature and account ID
- `setAccountId(accountId: string)` - Set account ID for GET requests
- `health()` - Check API health (GET request)
- `isAuthenticated()` - Check if client is authenticated
- `clearAuth()` - Clear authentication
- `getAccountId()` - Get current account ID

### Interfaces

```typescript
interface ClientConfig {
  baseUrl: string;
  accountId: string;
  timeout?: number;
}

interface AuthConfig {
  nearSignature: string;
  accountId: string;
  baseUrl?: string;
}

interface HealthResponse {
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
}
```

## Authentication

### GET Requests
- Uses `X-Near-Account` header with your NEAR account ID
- No signature required

### POST/DELETE Requests  
- Uses `Authorization: Bearer <NEAR_SIGNATURE>` header
- Also includes `X-Near-Account` header for context
- Requires valid NEAR signature token

## Configuration

### Default Settings
- **Base URL**: `https://api.opencrosspost.com/`
- **Health Path**: `/health`
- **Timeout**: 30000ms
- **Port**: 3999 (dev server)

### CORS Headers
The dev server includes these CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Near-Account`

## Complete API Reference

### System API
- `health()` - Check API health
- `getRateLimits()` - Get all rate limits
- `getEndpointRateLimit(endpoint)` - Get specific endpoint rate limit

### Auth API
- `authorizeNearAccount(signature, accountId)` - Authorize NEAR account
- `getNearAuthorizationStatus()` - Get NEAR auth status
- `loginToPlatform(platform, credentials)` - Login to platform
- `refreshToken()` - Refresh auth token
- `refreshProfile()` - Refresh user profile
- `getAuthStatus()` - Get authentication status
- `revokeAuth()` - Revoke authentication
- `getConnectedAccounts()` - Get connected accounts

### Post API
- `createPost(request)` - Create new post
- `repost(request)` - Repost existing post
- `quotePost(request)` - Quote post with comment
- `replyToPost(request)` - Reply to post
- `likePost(request)` - Like a post
- `unlikePost(request)` - Unlike a post
- `deletePost(request)` - Delete a post

### Activity API
- `getLeaderboard(period, limit)` - Get leaderboard
- `getAccountActivity(accountId, options)` - Get account activity
- `getAccountPosts(accountId, options)` - Get account posts

### Media Handling
- `normalizeMedia(media, options)` - Normalize media from Blob/File/URL/base64

### Request Overrides
- `healthWithOverrides(override)` - Health check with overrides
- `createPostWithOverrides(request, override)` - Create post with overrides
- `getRateLimitsWithOverrides(override)` - Rate limits with overrides

## Examples

See `examples/full-usage.ts` for complete usage examples including:
- All API endpoints with real examples
- Media normalization from different sources
- Request overrides for per-request auth
- Error handling with consistent error mapping
- Module Federation integration

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```
