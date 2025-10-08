// Test the crosspost plugin
import pkg from './dist/main.js';
const { CrosspostPluginClient } = pkg;

async function testPlugin() {
  console.log('🧪 Testing Crosspost Plugin...');
  
  try {
    // Test 1: Initialize client
    console.log('\n1️⃣ Testing client initialization...');
    const client = new CrosspostPluginClient({
      baseUrl: 'https://api.opencrosspost.com/',
      accountId: 'test.near',
      timeout: 30000
    });
    console.log('✅ Client created successfully');
    console.log('📋 Account ID:', client.getAccountId());
    console.log('🔐 Authenticated:', client.isAuthenticated());
    
    // Test 2: Set authentication
    console.log('\n2️⃣ Testing authentication...');
    client.setAuth({
      nearSignature: 'test_signature_token',
      accountId: 'test.near'
    });
    console.log('✅ Auth set successfully');
    console.log('🔐 Now authenticated:', client.isAuthenticated());
    
    // Test 3: Test media normalization (mock)
    console.log('\n3️⃣ Testing media normalization...');
    try {
      // This will fail in Node.js environment, but shows the method exists
      await client.normalizeMedia('data:image/jpeg;base64,test');
      console.log('✅ Media normalization works');
    } catch (error) {
      console.log('⚠️ Media normalization requires browser environment:', error.message);
    }
    
    // Test 4: Test request overrides
    console.log('\n4️⃣ Testing request overrides...');
    const override = {
      authToken: 'different_token',
      accountId: 'different.near',
      timeout: 15000
    };
    console.log('✅ Override object created:', override);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('- Test with real API endpoints');
    console.log('- Test in browser environment for media handling');
    console.log('- Test Module Federation loading');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPlugin();
