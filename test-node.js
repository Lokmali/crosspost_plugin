#!/usr/bin/env node

console.log('🧪 Node.js Crosspost Plugin Test\n');

// Test 1: Check if files exist
console.log('1️⃣ Checking file structure...');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'package.json',
    'dist/main.js',
    'dist/remoteEntry.js',
    'src/client.ts',
    'src/index.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allFilesExist = false;
    }
}

// Test 2: Check package.json
console.log('\n2️⃣ Checking package.json...');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Package name: ${pkg.name}`);
    console.log(`✅ Version: ${pkg.version}`);
    console.log(`✅ Scripts: ${Object.keys(pkg.scripts || {}).join(', ')}`);
} catch (error) {
    console.log(`❌ Package.json error: ${error.message}`);
    allFilesExist = false;
}

// Test 3: Check build output
console.log('\n3️⃣ Checking build output...');
try {
    const mainStats = fs.statSync('dist/main.js');
    const remoteStats = fs.statSync('dist/remoteEntry.js');
    
    console.log(`✅ main.js: ${(mainStats.size / 1024).toFixed(1)}KB`);
    console.log(`✅ remoteEntry.js: ${(remoteStats.size / 1024).toFixed(1)}KB`);
} catch (error) {
    console.log(`❌ Build output error: ${error.message}`);
    allFilesExist = false;
}

// Test 4: Test dev server
console.log('\n4️⃣ Testing dev server...');
const http = require('http');

function testDevServer() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3999/remoteEntry.js', (res) => {
            console.log(`✅ Dev server responding: ${res.statusCode}`);
            console.log(`✅ Content-Type: ${res.headers['content-type']}`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log(`❌ Dev server error: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            console.log('❌ Dev server timeout');
            resolve(false);
        });
    });
}

// Test 5: Test module import (if possible)
console.log('\n5️⃣ Testing module import...');
try {
    // Try to import the built module
    const modulePath = path.resolve('./dist/main.js');
    if (fs.existsSync(modulePath)) {
        console.log(`✅ Module file exists: ${modulePath}`);
        console.log('ℹ️  Module import test requires browser environment');
    } else {
        console.log('❌ Module file not found');
    }
} catch (error) {
    console.log(`❌ Module test error: ${error.message}`);
}

// Run dev server test
testDevServer().then((devServerOk) => {
    console.log('\n📊 Test Summary:');
    console.log(`Files: ${allFilesExist ? '✅' : '❌'}`);
    console.log(`Dev Server: ${devServerOk ? '✅' : '❌'}`);
    
    if (allFilesExist && devServerOk) {
        console.log('\n🎉 Plugin is ready for use!');
        console.log('\n📝 Next steps:');
        console.log('- Open test-comprehensive.html in browser');
        console.log('- Test Module Federation loading');
        console.log('- Test API methods with real data');
    } else {
        console.log('\n⚠️  Some tests failed. Check the issues above.');
    }
});
