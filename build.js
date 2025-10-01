/**
 * Build Script for Crosspost Plugin
 * This script handles building, bundling, and preparing the plugin for distribution
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PluginBuilder {
  constructor() {
    this.buildDir = path.join(__dirname, 'dist');
    this.srcDir = path.join(__dirname, 'src');
    this.rootFiles = ['index.js', 'plugin.config.js', 'package.json', 'README.md', 'LICENSE'];
  }

  async build() {
    console.log('🚀 Starting Crosspost Plugin build process...');
    
    try {
      // Clean build directory
      await this.cleanBuildDir();
      
      // Create build directory
      await this.createBuildDir();
      
      // Copy source files
      await this.copySourceFiles();
      
      // Copy root files
      await this.copyRootFiles();
      
      // Generate build info
      await this.generateBuildInfo();
      
      // Validate build
      await this.validateBuild();
      
      console.log('✅ Build completed successfully!');
      console.log(`📦 Build output: ${this.buildDir}`);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async cleanBuildDir() {
    console.log('🧹 Cleaning build directory...');
    
    try {
      await fs.rm(this.buildDir, { recursive: true, force: true });
      console.log('✅ Build directory cleaned');
    } catch (error) {
      // Directory might not exist, which is fine
      console.log('ℹ️ Build directory did not exist');
    }
  }

  async createBuildDir() {
    console.log('📁 Creating build directory...');
    
    await fs.mkdir(this.buildDir, { recursive: true });
    await fs.mkdir(path.join(this.buildDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(this.buildDir, 'examples'), { recursive: true });
    await fs.mkdir(path.join(this.buildDir, 'test'), { recursive: true });
    
    console.log('✅ Build directory structure created');
  }

  async copySourceFiles() {
    console.log('📋 Copying source files...');
    
    const srcFiles = await fs.readdir(this.srcDir);
    
    for (const file of srcFiles) {
      const srcPath = path.join(this.srcDir, file);
      const destPath = path.join(this.buildDir, 'src', file);
      
      await fs.copyFile(srcPath, destPath);
      console.log(`  ✓ Copied ${file}`);
    }
    
    console.log('✅ Source files copied');
  }

  async copyRootFiles() {
    console.log('📋 Copying root files...');
    
    for (const file of this.rootFiles) {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(this.buildDir, file);
      
      try {
        await fs.copyFile(srcPath, destPath);
        console.log(`  ✓ Copied ${file}`);
      } catch (error) {
        console.log(`  ⚠️ Could not copy ${file}: ${error.message}`);
      }
    }

    // Copy examples and tests
    await this.copyDirectory('examples');
    await this.copyDirectory('test');
    
    console.log('✅ Root files copied');
  }

  async copyDirectory(dirName) {
    const srcDir = path.join(__dirname, dirName);
    const destDir = path.join(this.buildDir, dirName);
    
    try {
      const files = await fs.readdir(srcDir);
      
      for (const file of files) {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        
        await fs.copyFile(srcPath, destPath);
        console.log(`  ✓ Copied ${dirName}/${file}`);
      }
    } catch (error) {
      console.log(`  ⚠️ Could not copy ${dirName} directory: ${error.message}`);
    }
  }

  async generateBuildInfo() {
    console.log('ℹ️ Generating build info...');
    
    const packageJson = JSON.parse(
      await fs.readFile(path.join(__dirname, 'package.json'), 'utf8')
    );
    
    const buildInfo = {
      name: packageJson.name,
      version: packageJson.version,
      buildDate: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      files: await this.getBuildFileList()
    };
    
    await fs.writeFile(
      path.join(this.buildDir, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );
    
    console.log('✅ Build info generated');
  }

  async getBuildFileList() {
    const files = [];
    
    async function walkDir(dir, prefix = '') {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
        
        if (item.isDirectory()) {
          await walkDir(fullPath, relativePath);
        } else {
          const stats = await fs.stat(fullPath);
          files.push({
            path: relativePath,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
    }
    
    await walkDir(this.buildDir);
    return files;
  }

  async validateBuild() {
    console.log('🔍 Validating build...');
    
    // Check required files exist
    const requiredFiles = [
      'index.js',
      'plugin.config.js',
      'package.json',
      'src/crosspost-client.js',
      'src/auth-manager.js',
      'src/content-optimizer.js',
      'src/analytics-collector.js'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.buildDir, file);
      
      try {
        await fs.access(filePath);
        console.log(`  ✓ ${file} exists`);
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    // Validate package.json
    const packagePath = path.join(this.buildDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    
    if (!packageJson.name || !packageJson.version || !packageJson.main) {
      throw new Error('Invalid package.json: missing required fields');
    }
    
    console.log('✅ Build validation passed');
  }

  async createArchive() {
    console.log('📦 Creating distribution archive...');
    
    const packageJson = JSON.parse(
      await fs.readFile(path.join(this.buildDir, 'package.json'), 'utf8')
    );
    
    const archiveName = `${packageJson.name}-${packageJson.version}.tar.gz`;
    const archivePath = path.join(__dirname, archiveName);
    
    // Note: In a real implementation, you'd use a library like tar or archiver
    // For now, we'll just log what would happen
    console.log(`📦 Would create archive: ${archiveName}`);
    console.log('ℹ️ Archive creation skipped (requires tar library)');
    
    return archivePath;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const builder = new PluginBuilder();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Crosspost Plugin Build Script

Usage:
  node build.js [options]

Options:
  --help, -h     Show this help message
  --archive, -a  Create distribution archive after build
  --clean, -c    Only clean the build directory
  --validate, -v Only validate existing build

Examples:
  node build.js              # Standard build
  node build.js --archive    # Build and create archive
  node build.js --clean      # Clean build directory only
    `);
    return;
  }
  
  if (args.includes('--clean') || args.includes('-c')) {
    await builder.cleanBuildDir();
    return;
  }
  
  if (args.includes('--validate') || args.includes('-v')) {
    await builder.validateBuild();
    return;
  }
  
  // Standard build
  await builder.build();
  
  if (args.includes('--archive') || args.includes('-a')) {
    await builder.createArchive();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Build script failed:', error.message);
    process.exit(1);
  });
}

export { PluginBuilder };
