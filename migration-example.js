// 🔄 Crosspost SDK Migration Example
// This shows exactly how to migrate from @crosspost/sdk to your plugin

// ===== BEFORE (Old @crosspost/sdk) =====
/*
import { CrosspostClient } from '@crosspost/sdk';

const client = new CrosspostClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.opencrosspost.com/'
});

// Usage
const health = await client.health();
const accounts = await client.getConnectedAccounts();
const post = await client.createPost({
  content: { text: 'Hello!' },
  platforms: ['twitter']
});
*/

// ===== AFTER (Your Plugin) =====

// Option 1: Module Federation (Recommended for production)
import { CrosspostPluginClient } from 'crosspostPlugin/plugin';

// Option 2: Direct Import (Alternative)
// import { CrosspostPluginClient } from './dist/main.js';

// Initialize client
const client = new CrosspostPluginClient({
  baseUrl: 'https://api.opencrosspost.com/',
  accountId: 'your.near'  // Required for GET requests
});

// Set NEAR authentication (required for POST/DELETE)
client.setAuth({
  nearSignature: 'your_near_signature',
  accountId: 'your.near'
});

// ===== VERIFICATION TESTS =====

async function testMigration() {
  console.log('🧪 Testing migration...');
  
  try {
    // Test 1: Health check (GET request)
    console.log('1️⃣ Testing health()...');
    const health = await client.health();
    console.log('✅ Health:', health);
  } catch (error) {
    console.log('❌ Health test failed:', error.message);
  }
  
  try {
    // Test 2: Get connected accounts (GET request)
    console.log('2️⃣ Testing getConnectedAccounts()...');
    const accounts = await client.getConnectedAccounts();
    console.log('✅ Connected accounts:', accounts);
  } catch (error) {
    console.log('❌ Accounts test failed:', error.message);
  }
  
  try {
    // Test 3: Create post (POST request - requires NEAR signature)
    console.log('3️⃣ Testing createPost()...');
    const post = await client.createPost({
      content: {
        text: 'Hello from NEAR!',
        media: []
      },
      platforms: ['twitter']
    });
    console.log('✅ Post created:', post);
  } catch (error) {
    console.log('❌ Post creation failed:', error.message);
  }
  
  try {
    // Test 4: Get leaderboard (GET request)
    console.log('4️⃣ Testing getLeaderboard()...');
    const leaderboard = await client.getLeaderboard('weekly', 10);
    console.log('✅ Leaderboard:', leaderboard);
  } catch (error) {
    console.log('❌ Leaderboard test failed:', error.message);
  }
}

// ===== HOST APPLICATION SETUP =====

// For Module Federation, add to your webpack config:
/*
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        crosspostPlugin: 'crosspostPlugin@http://localhost:3999/remoteEntry.js'
      }
    })
  ]
};
*/

// ===== PRODUCTION DEPLOYMENT =====

// 1. Build your plugin
// npm run build

// 2. Copy files to your CDN/server
// cp dist/main.js your-cdn/
// cp dist/remoteEntry.js your-cdn/

// 3. Update Module Federation URL
// crosspostPlugin: 'crosspostPlugin@https://your-cdn.com/remoteEntry.js'

// ===== MIGRATION CHECKLIST =====

console.log(`
✅ Migration Checklist:
□ Replace import: @crosspost/sdk → crosspostPlugin/plugin
□ Update initialization: add accountId, remove apiKey
□ Add setAuth() call with NEAR signature
□ Test health() endpoint
□ Test getConnectedAccounts() endpoint  
□ Test createPost() endpoint
□ Test one activity endpoint
□ Update webpack config for Module Federation
□ Deploy to production
□ Remove @crosspost/sdk dependency
`);

// Run the test
// testMigration();
