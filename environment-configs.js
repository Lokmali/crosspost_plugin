// 🎯 Environment-Specific Config Blocks for Your Crosspost Plugin

// ===== DEVELOPMENT CONFIG =====
// config/development.js

export const developmentConfig = {
  // API Configuration
  baseUrl: 'https://api.opencrosspost.com/',
  accountId: 'your.near',
  nearSignature: 'your_dev_near_signature',
  timeout: 30000,
  
  // Module Federation
  mfRemote: 'http://localhost:3999/remoteEntry.js',
  
  // Headers
  headers: {
    'X-Environment': 'development',
    'X-Debug': 'true'
  }
};

// ===== STAGING CONFIG =====
// config/staging.js

export const stagingConfig = {
  // API Configuration
  baseUrl: 'https://staging-api.opencrosspost.com/',
  accountId: 'your.near',
  nearSignature: 'your_staging_near_signature',
  timeout: 30000,
  
  // Module Federation
  mfRemote: 'https://staging-cdn.com/remoteEntry.js',
  
  // Headers
  headers: {
    'X-Environment': 'staging',
    'X-Debug': 'false'
  }
};

// ===== PRODUCTION CONFIG =====
// config/production.js

export const productionConfig = {
  // API Configuration
  baseUrl: 'https://api.opencrosspost.com/',
  accountId: 'your.near',
  nearSignature: 'your_prod_near_signature',
  timeout: 30000,
  
  // Module Federation
  mfRemote: 'https://cdn.com/remoteEntry.js',
  
  // Headers
  headers: {
    'X-Environment': 'production',
    'X-Debug': 'false'
  }
};

// ===== WEBPACK CONFIGURATIONS =====

// Development Webpack Config
// webpack.dev.js
export const devWebpackConfig = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        crosspostPlugin: 'crosspostPlugin@http://localhost:3999/remoteEntry.js'
      }
    })
  ]
};

// Staging Webpack Config
// webpack.staging.js
export const stagingWebpackConfig = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        crosspostPlugin: 'crosspostPlugin@https://staging-cdn.com/remoteEntry.js'
      }
    })
  ]
};

// Production Webpack Config
// webpack.prod.js
export const prodWebpackConfig = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        crosspostPlugin: 'crosspostPlugin@https://cdn.com/remoteEntry.js'
      }
    })
  ]
};

// ===== CLIENT FACTORY =====
// utils/crosspost-client-factory.js

import { CrosspostPluginClient } from 'crosspostPlugin/plugin';

export function createCrosspostClient(environment = 'development') {
  let config;
  
  switch (environment) {
    case 'development':
      config = developmentConfig;
      break;
    case 'staging':
      config = stagingConfig;
      break;
    case 'production':
      config = productionConfig;
      break;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
  
  // Initialize client
  const client = new CrosspostPluginClient({
    baseUrl: config.baseUrl,
    accountId: config.accountId,
    timeout: config.timeout,
    headers: config.headers
  });
  
  // Set NEAR authentication
  client.setAuth(config.nearSignature, config.accountId);
  
  return client;
}

// ===== USAGE EXAMPLES =====

// Basic Usage
// app.js
import { createCrosspostClient } from './utils/crosspost-client-factory';

const client = createCrosspostClient(process.env.NODE_ENV);

// Test all endpoints
async function testMigration() {
  try {
    // GET requests (require accountId)
    const health = await client.health();
    console.log('✅ Health:', health);
    
    const accounts = await client.getConnectedAccounts();
    console.log('✅ Accounts:', accounts);
    
    // POST request (requires signature + accountId)
    const post = await client.createPost({
      content: {
        text: 'Hello from NEAR!',
        media: []
      },
      platforms: ['twitter']
    });
    console.log('✅ Post created:', post);
    
    // Activity GET (requires accountId)
    const leaderboard = await client.getLeaderboard('weekly', 5);
    console.log('✅ Leaderboard:', leaderboard);
    
    console.log('🎉 All tests passed! Migration successful!');
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
  }
}

// React Component Usage
// components/CrosspostComponent.jsx
import React, { useEffect, useState } from 'react';
import { createCrosspostClient } from '../utils/crosspost-client-factory';

export function CrosspostComponent() {
  const [client, setClient] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const initClient = async () => {
      try {
        const crosspostClient = createCrosspostClient(process.env.NODE_ENV);
        setClient(crosspostClient);
        
        // Test health
        const healthStatus = await crosspostClient.health();
        setHealth(healthStatus);
      } catch (error) {
        console.error('Failed to initialize client:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initClient();
  }, []);
  
  const handleCreatePost = async () => {
    if (!client) return;
    
    try {
      const post = await client.createPost({
        content: {
          text: 'Hello from NEAR!',
          media: []
        },
        platforms: ['twitter']
      });
      console.log('Post created:', post);
    } catch (error) {
      console.error('Post creation failed:', error);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Crosspost Plugin</h2>
      <p>Health: {health?.status || 'Unknown'}</p>
      <button onClick={handleCreatePost}>Create Post</button>
    </div>
  );
}

// ===== ENVIRONMENT VARIABLES =====
// .env.development
/*
CROSSPOST_BASE_URL=https://api.opencrosspost.com/
CROSSPOST_ACCOUNT_ID=your.near
CROSSPOST_NEAR_SIGNATURE=your_dev_signature
CROSSPOST_MF_REMOTE=http://localhost:3999/remoteEntry.js
CROSSPOST_TIMEOUT=30000
*/

// .env.staging
/*
CROSSPOST_BASE_URL=https://staging-api.opencrosspost.com/
CROSSPOST_ACCOUNT_ID=your.near
CROSSPOST_NEAR_SIGNATURE=your_staging_signature
CROSSPOST_MF_REMOTE=https://staging-cdn.com/remoteEntry.js
CROSSPOST_TIMEOUT=30000
*/

// .env.production
/*
CROSSPOST_BASE_URL=https://api.opencrosspost.com/
CROSSPOST_ACCOUNT_ID=your.near
CROSSPOST_NEAR_SIGNATURE=your_prod_signature
CROSSPOST_MF_REMOTE=https://cdn.com/remoteEntry.js
CROSSPOST_TIMEOUT=30000
*/

// ===== DEPLOYMENT SCRIPTS =====
// scripts/deploy.js

import { execSync } from 'child_process';
import fs from 'fs';

async function deployCrosspostPlugin(environment) {
  console.log(`🚀 Deploying Crosspost Plugin to ${environment}...`);
  
  // Build the plugin
  console.log('Building plugin...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Copy files to appropriate CDN
  const files = ['dist/remoteEntry.js', 'dist/main.js'];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      // Copy to your CDN here based on environment
      console.log(`✅ Copied ${file} to ${environment} CDN`);
    } else {
      console.error(`❌ File not found: ${file}`);
    }
  }
  
  // Update Module Federation URL
  const mfUrl = environment === 'development' 
    ? 'http://localhost:3999/remoteEntry.js'
    : `https://${environment}-cdn.com/remoteEntry.js`;
    
  console.log(`Update your webpack config with: crosspostPlugin@${mfUrl}`);
  
  console.log(`🎉 Deployment to ${environment} complete!`);
}

// Deploy to different environments
// deployCrosspostPlugin('staging');
// deployCrosspostPlugin('production');
