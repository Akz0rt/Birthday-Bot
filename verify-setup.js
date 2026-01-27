#!/usr/bin/env node

/**
 * Verification Script: Check if project is ready for Azure deployment
 * 
 * Usage:
 *   node verify-setup.js
 * 
 * This script checks all required files and configurations before deployment.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    checks.passed.push(`✅ ${description}`);
    return true;
  } else {
    checks.failed.push(`❌ ${description} - File not found: ${filePath}`);
    return false;
  }
}

function checkEnvVar(varName, description) {
  if (process.env[varName]) {
    checks.passed.push(`✅ ${description} (${varName})`);
    return true;
  } else {
    checks.failed.push(`❌ ${description} - Environment variable missing: ${varName}`);
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      checks.passed.push(`✅ ${description}`);
      return true;
    } else {
      checks.failed.push(`❌ ${description} - String not found in ${filePath}`);
      return false;
    }
  } catch (error) {
    checks.failed.push(`❌ ${description} - Error reading file: ${error.message}`);
    return false;
  }
}

function checkDir(dirPath, description) {
  try {
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      checks.passed.push(`✅ ${description}`);
      return true;
    } else {
      checks.failed.push(`❌ ${description} - Not a directory: ${dirPath}`);
      return false;
    }
  } catch (error) {
    checks.failed.push(`❌ ${description} - Directory not found: ${dirPath}`);
    return false;
  }
}

console.log('\n🔍 Birthday Bot - Azure Deployment Verification\n');
console.log('=' .repeat(50) + '\n');

// Check project structure
console.log('📁 Project Structure:');
checkDir('src', 'src/ directory exists');
checkDir('src/commands', 'src/commands/ directory exists');
checkDir('src/services', 'src/services/ directory exists');
checkDir('src/utils', 'src/utils/ directory exists');
console.log();

// Check required files
console.log('📄 Required Files:');
checkFile('package.json', 'package.json exists');
checkFile('.env', '.env configuration file exists');
checkFile('src/config.js', 'src/config.js exists');
checkFile('src/index.js', 'src/index.js exists');
checkFile('src/services/CosmosDBService.js', 'CosmosDBService.js exists');
checkFile('src/commands/birthday-set.js', 'birthday-set.js command exists');
checkFile('src/commands/birthday.js', 'birthday.js command exists');
checkFile('src/commands/birthdays-coming.js', 'birthdays-coming.js command exists');
console.log();

// Check documentation
console.log('📚 Documentation:');
checkFile('AZURE_DEPLOYMENT.md', 'Azure deployment guide exists');
checkFile('QUICK_SETUP.md', 'Quick setup guide exists');
checkFile('MIGRATION_SUMMARY.md', 'Migration summary exists');
checkFile('DEPLOYMENT_CHECKLIST.md', 'Deployment checklist exists');
checkFile('INDEX.md', 'Index file exists');
console.log();

// Check deployment files
console.log('🚀 Deployment Files:');
checkFile('Dockerfile', 'Dockerfile exists');
checkFile('vercel.json', 'vercel.json exists');
checkFile('web.config', 'web.config exists');
checkFile('migrate.js', 'Migration script exists');
console.log();

// Check code updates
console.log('💾 Code Updates:');
checkFileContent('src/services/NotificationService.js', 'CosmosDBService', 'NotificationService uses CosmosDBService');
checkFileContent('src/commands/birthday-set.js', 'CosmosDBService', 'birthday-set uses CosmosDBService');
checkFileContent('src/commands/birthday.js', 'CosmosDBService', 'birthday.js uses CosmosDBService');
checkFileContent('src/commands/birthdays-coming.js', 'CosmosDBService', 'birthdays-coming uses CosmosDBService');
checkFileContent('package.json', '@azure/cosmos', 'package.json has @azure/cosmos dependency');
checkFileContent('src/config.js', 'cosmosEndpoint', 'config.js has Cosmos configuration');
console.log();

// Check environment variables
console.log('⚙️  Environment Variables:');
checkEnvVar('DISCORD_TOKEN', 'Discord token configured');
checkEnvVar('CLIENT_ID', 'Client ID configured');
checkEnvVar('GUILD_ID', 'Guild ID configured');
checkEnvVar('BIRTHDAY_CHANNEL_ID', 'Birthday channel ID configured');
checkEnvVar('CONGRATS_CHANNEL_ID', 'Congrats channel ID configured');
checkEnvVar('COSMOS_ENDPOINT', 'Cosmos DB endpoint configured');
checkEnvVar('COSMOS_KEY', 'Cosmos DB key configured');
checkEnvVar('COSMOS_DB_NAME', 'Cosmos DB name configured');
console.log();

// Check .gitignore
console.log('🔒 Security:');
checkFileContent('.gitignore', '.env', '.env file in .gitignore');
checkFileContent('.gitignore', 'node_modules', 'node_modules in .gitignore');
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(path.join(process.cwd(), '.git'))) {
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env')) {
      checks.passed.push('✅ .env is properly ignored by Git');
    }
  } catch (error) {
    // Already checked above
  }
}
console.log();

// Cosmos DB specific checks
console.log('☁️  Azure Cosmos DB:');
const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
if (cosmosEndpoint) {
  if (cosmosEndpoint.includes(':443/')) {
    checks.passed.push('✅ COSMOS_ENDPOINT has correct format');
  } else {
    checks.warnings.push('⚠️  COSMOS_ENDPOINT may not have correct format (should end with :443/)');
  }
}
console.log();

// Summary
console.log('=' .repeat(50));
console.log('\n📊 Verification Summary:\n');

checks.passed.forEach(msg => console.log(msg));
console.log();

if (checks.warnings.length > 0) {
  checks.warnings.forEach(msg => console.log(msg));
  console.log();
}

if (checks.failed.length > 0) {
  checks.failed.forEach(msg => console.log(msg));
  console.log();
}

// Final status
const totalPassed = checks.passed.length;
const totalFailed = checks.failed.length;
const totalWarnings = checks.warnings.length;

console.log(`\n✅ Passed: ${totalPassed}`);
if (totalWarnings > 0) console.log(`⚠️  Warnings: ${totalWarnings}`);
if (totalFailed > 0) console.log(`❌ Failed: ${totalFailed}`);

console.log();

if (totalFailed === 0) {
  console.log('🎉 All checks passed! Ready for Azure deployment!');
  console.log('\n📖 Next steps:');
  console.log('1. Read QUICK_SETUP.md for deployment instructions');
  console.log('2. Create Cosmos DB account in Azure Portal');
  console.log('3. Update .env with Cosmos credentials');
  console.log('4. Run: npm run migrate (if you have birthdays.json)');
  console.log('5. Deploy to Azure!');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  console.log('\n💡 Tips:');
  console.log('- Make sure .env file exists in the project root');
  console.log('- Check that all environment variables are set');
  console.log('- Verify COSMOS_ENDPOINT format');
  console.log('- See QUICK_SETUP.md for more information');
  process.exit(1);
}
