import { CrosspostPluginClient } from '../src/client';

// Example usage with NEAR authentication
async function exampleUsage() {
  // Initialize client with OpenCrosspost API
  const client = new CrosspostPluginClient({
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near',
    timeout: 30000
  });

  // For GET requests, just set the account ID
  client.setAccountId('your.near');
  
  // Check health (GET request - uses X-Near-Account header)
  const health = await client.health();
  console.log('Health check:', health);

  // For POST/DELETE requests, you need a NEAR signature
  // This is where you'd generate the signature using your NEAR signer
  const nearSignature = 'YOUR_NEAR_SIGNATURE_TOKEN'; // Generated from near-sign-verify
  
  client.setAuth({
    nearSignature: nearSignature,
    accountId: 'your.near',
    baseUrl: 'https://api.opencrosspost.com/'
  });

  // Now you can make authenticated requests
  console.log('Authenticated:', client.isAuthenticated());
  console.log('Account ID:', client.getAccountId());
}

// Example with different environments
async function environmentExamples() {
  // Production
  const prodClient = new CrosspostPluginClient({
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near'
  });

  // Development/Staging (if self-hosted)
  const devClient = new CrosspostPluginClient({
    baseUrl: 'https://api.example.com/',
    accountId: 'your.near'
  });

  // Both clients work the same way
  await prodClient.health();
  await devClient.health();
}

// Example with Module Federation
async function moduleFederationExample() {
  // In your host app, after loading the remote:
  const { CrosspostPluginClient } = await import('crosspost_plugin/plugin');
  
  const client = new CrosspostPluginClient({
    baseUrl: 'https://api.opencrosspost.com/',
    accountId: 'your.near'
  });

  const health = await client.health();
  console.log('MF Health:', health);
}

export { exampleUsage, environmentExamples, moduleFederationExample };
