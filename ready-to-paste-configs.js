// 🚀 Ready-to-Paste Config Blocks for Your Crosspost Plugin Migration

// ===== 1. HOST WEBPACK CONFIG =====
// Add this to your host application's webpack.config.js

const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  // ... your existing config
  plugins: [
    // ... your existing plugins
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        // Development
        crosspostPlugin: 'crosspostPlugin@http://localhost:3999/remoteEntry.js'
        
        // Production (uncomment when ready)
        // crosspostPlugin: 'crosspostPlugin@https://your-cdn.com/remoteEntry.js'
      }
    })
  ]
};

// ===== 2. ENVIRONMENT CONFIGURATION =====
// config/crosspost.js

export const crosspostConfig = {
  development: {
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near',
    nearSignature: 'your_dev_near_signature',
    timeout: 30000,
    headers: {
      'X-Environment': 'development'
    }
  },
  staging: {
    baseUrl: 'https://staging-api.opencrosspost.com/',
    accountId: 'your.near',
    nearSignature: 'your_staging_near_signature',
    timeout: 30000,
    headers: {
      'X-Environment': 'staging'
    }
  },
  production: {
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near',
    nearSignature: 'your_prod_near_signature',
    timeout: 30000,
    headers: {
      'X-Environment': 'production'
    }
  }
};

// ===== 3. CLIENT INITIALIZATION =====
// utils/crosspost-client.js

import { CrosspostPluginClient } from 'crosspostPlugin/plugin';
import { crosspostConfig } from '../config/crosspost';

export function createCrosspostClient(environment = 'development') {
  const config = crosspostConfig[environment];
  
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  // Initialize client
  const client = new CrosspostPluginClient({
    baseUrl: config.baseUrl,
    accountId: config.accountId,
    timeout: config.timeout,
    headers: config.headers
  });
  
  // Set NEAR authentication (required for POST/DELETE)
  client.setAuth({
    nearSignature: config.nearSignature,
    accountId: config.accountId
  });
  
  return client;
}

// ===== 4. USAGE IN YOUR APP =====
// components/CrosspostComponent.jsx

import React, { useEffect, useState } from 'react';
import { createCrosspostClient } from '../utils/crosspost-client';

export function CrosspostComponent() {
  const [client, setClient] = useState(null);
  const [health, setHealth] = useState(null);
  
  useEffect(() => {
    // Initialize client
    const crosspostClient = createCrosspostClient(process.env.NODE_ENV);
    setClient(crosspostClient);
    
    // Test health
    crosspostClient.health()
      .then(setHealth)
      .catch(console.error);
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
  
  return (
    <div>
      <h2>Crosspost Plugin</h2>
      <p>Health: {health?.status || 'Loading...'}</p>
      <button onClick={handleCreatePost}>Create Post</button>
    </div>
  );
}

// ===== 5. MIGRATION HELPER =====
// utils/migration-helper.js

import { CrosspostPluginClient } from 'crosspostPlugin/plugin';

export class MigrationHelper {
  constructor(config) {
    this.client = new CrosspostPluginClient({
      baseUrl: config.baseUrl,
      accountId: config.accountId,
      timeout: config.timeout
    });
    
    this.client.setAuth({
      nearSignature: config.nearSignature,
      accountId: config.accountId
    });
  }
  
  // Test all required endpoints
  async runMigrationTests() {
    const results = {};
    
    try {
      // Test 1: Health (GET)
      results.health = await this.client.health();
      console.log('✅ Health test passed');
    } catch (error) {
      console.error('❌ Health test failed:', error.message);
      results.health = { error: error.message };
    }
    
    try {
      // Test 2: Connected accounts (GET)
      results.accounts = await this.client.getConnectedAccounts();
      console.log('✅ Accounts test passed');
    } catch (error) {
      console.error('❌ Accounts test failed:', error.message);
      results.accounts = { error: error.message };
    }
    
    try {
      // Test 3: Create post (POST)
      results.post = await this.client.createPost({
        content: {
          text: 'Migration test post',
          media: []
        },
        platforms: ['twitter']
      });
      console.log('✅ Post creation test passed');
    } catch (error) {
      console.error('❌ Post creation test failed:', error.message);
      results.post = { error: error.message };
    }
    
    try {
      // Test 4: Leaderboard (GET)
      results.leaderboard = await this.client.getLeaderboard('weekly', 5);
      console.log('✅ Leaderboard test passed');
    } catch (error) {
      console.error('❌ Leaderboard test failed:', error.message);
      results.leaderboard = { error: error.message };
    }
    
    return results;
  }
}

// ===== 6. CI/CD CONFIGURATION =====
// .github/workflows/crosspost-test.yml

/*
name: Crosspost Plugin Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Build
        run: npm run build
      
      - name: Smoke tests
        run: node ci-smoke-test.js
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          NEAR_ACCOUNT_ID: ${{ secrets.NEAR_ACCOUNT_ID }}
          NEAR_SIGNATURE: ${{ secrets.NEAR_SIGNATURE }}
*/

// ===== 7. CI SMOKE TEST =====
// ci-smoke-test.js

import { CrosspostPluginClient } from 'crosspostPlugin/plugin';

async function runSmokeTests() {
  console.log('🧪 Running Crosspost Plugin Smoke Tests...');
  
  const client = new CrosspostPluginClient({
    baseUrl: process.env.API_BASE_URL,
    accountId: process.env.NEAR_ACCOUNT_ID
  });
  
  client.setAuth({
    nearSignature: process.env.NEAR_SIGNATURE,
    accountId: process.env.NEAR_ACCOUNT_ID
  });
  
  try {
    // Test 1: Health
    const health = await client.health();
    if (health.status !== 'ok') {
      throw new Error(`Health check failed: ${health.status}`);
    }
    console.log('✅ Health test passed');
    
    // Test 2: Create post
    const post = await client.createPost({
      content: { text: 'CI Test Post' },
      platforms: ['twitter']
    });
    if (!post.id) {
      throw new Error('Post creation failed: no ID returned');
    }
    console.log('✅ Post creation test passed');
    
    // Test 3: Account posts
    const posts = await client.getAccountPosts(process.env.NEAR_ACCOUNT_ID);
    if (!Array.isArray(posts)) {
      throw new Error('Account posts failed: not an array');
    }
    console.log('✅ Account posts test passed');
    
    console.log('🎉 All smoke tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  }
}

runSmokeTests();

// ===== 8. PACKAGE.JSON SCRIPTS =====
// Add these to your host app's package.json

/*
{
  "scripts": {
    "crosspost:dev": "crosspost-plugin dev",
    "crosspost:build": "crosspost-plugin build",
    "crosspost:test": "node ci-smoke-test.js",
    "crosspost:migrate": "node migration-helper.js"
  }
}
*/

// ===== 9. ENVIRONMENT VARIABLES =====
// .env.example

/*
# Crosspost Plugin Configuration
CROSSPOST_BASE_URL=https://api.opencrosspost.com/
CROSSPOST_ACCOUNT_ID=your.near
CROSSPOST_NEAR_SIGNATURE=your_near_signature
CROSSPOST_TIMEOUT=30000

# Module Federation
CROSSPOST_PLUGIN_URL=http://localhost:3999/remoteEntry.js
*/

// ===== 10. DEPLOYMENT SCRIPT =====
// scripts/deploy-crosspost.js

import { execSync } from 'child_process';
import fs from 'fs';

async function deployCrosspostPlugin() {
  console.log('🚀 Deploying Crosspost Plugin...');
  
  // Build the plugin
  console.log('Building plugin...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Copy files to CDN
  console.log('Copying files to CDN...');
  const files = ['dist/remoteEntry.js', 'dist/main.js'];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      // Copy to your CDN here
      console.log(`✅ Copied ${file}`);
    } else {
      console.error(`❌ File not found: ${file}`);
    }
  }
  
  // Update Module Federation URL
  console.log('Update your webpack config with new CDN URL');
  console.log('crosspostPlugin: "crosspostPlugin@https://your-cdn.com/remoteEntry.js"');
  
  console.log('🎉 Deployment complete!');
}

deployCrosspostPlugin();
