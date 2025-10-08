// Simple test to verify the plugin structure
console.log('🧪 Testing Crosspost Plugin Structure...');

// Test 1: Check if files exist
const fs = require('fs');
const path = require('path');

console.log('\n1️⃣ Checking file structure...');

const requiredFiles = [
    'package.json',
    'rspack.config.cjs',
    'tsconfig.json',
    'src/client.ts',
    'src/index.ts',
    'dist/main.js',
    'dist/remoteEntry.js'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
    }
});

// Test 2: Check package.json
console.log('\n2️⃣ Checking package.json...');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Package name: ${pkg.name}`);
    console.log(`✅ Version: ${pkg.version}`);
    console.log(`✅ Scripts: ${Object.keys(pkg.scripts).join(', ')}`);
} catch (error) {
    console.log(`❌ Package.json error: ${error.message}`);
}

// Test 3: Check build output
console.log('\n3️⃣ Checking build output...');
if (fs.existsSync('dist/main.js')) {
    const mainSize = fs.statSync('dist/main.js').size;
    console.log(`✅ main.js size: ${Math.round(mainSize / 1024)}KB`);
} else {
    console.log('❌ main.js not found');
}

if (fs.existsSync('dist/remoteEntry.js')) {
    const remoteSize = fs.statSync('dist/remoteEntry.js').size;
    console.log(`✅ remoteEntry.js size: ${Math.round(remoteSize / 1024)}KB`);
} else {
    console.log('❌ remoteEntry.js not found');
}

// Test 4: Check dev server
console.log('\n4️⃣ Testing dev server...');
const http = require('http');

const testUrl = 'http://localhost:3999/remoteEntry.js';
const req = http.get(testUrl, (res) => {
    console.log(`✅ Dev server responding: ${res.statusCode}`);
    console.log(`✅ Content-Type: ${res.headers['content-type']}`);
    res.on('data', () => {}); // Consume data
    res.on('end', () => {
        console.log('\n🎉 Plugin structure test completed!');
        console.log('\n📝 Next steps:');
        console.log('- Open test-browser.html in browser');
        console.log('- Test Module Federation loading');
        console.log('- Test API methods with real data');
    });
});

req.on('error', (error) => {
    console.log(`❌ Dev server not running: ${error.message}`);
    console.log('💡 Run "npm run dev" to start the server');
});

req.setTimeout(5000, () => {
    console.log('❌ Dev server timeout');
    req.destroy();
});
