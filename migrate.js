#!/usr/bin/env node

/**
 * Migration Script: Import birthdays from birthdays.json to Cosmos DB
 * 
 * Usage:
 *   node migrate.js
 * 
 * This script reads existing birthdays from birthdays.json and imports them
 * into Azure Cosmos DB. Make sure your .env file is configured with Cosmos DB
 * credentials before running this.
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const CosmosDBService = require('./src/services/CosmosDBService');

async function migrateData() {
    try {
        console.log('🔄 Starting migration from birthdays.json to Cosmos DB...\n');

        // Read birthdays.json
        const birthdaysPath = path.join(process.cwd(), 'birthdays.json');
        
        let data;
        try {
            const fileContent = await fs.readFile(birthdaysPath, 'utf8');
            data = JSON.parse(fileContent);
        } catch (error) {
            console.error('❌ Error reading birthdays.json:', error.message);
            console.log('\nMake sure birthdays.json exists in the project root.');
            process.exit(1);
        }

        if (!data || Object.keys(data).length === 0) {
            console.log('⚠️  No birthdays found in birthdays.json');
            process.exit(0);
        }

        console.log(`Found ${Object.keys(data).length} birthdays to migrate.\n`);

        // Migrate to Cosmos DB
        const count = await CosmosDBService.migrateFromJson(data);

        console.log(`\n✅ Successfully migrated ${count} birthdays to Cosmos DB!`);
        console.log('\nMigration Summary:');
        console.log(`- Source: birthdays.json`);
        console.log(`- Destination: ${process.env.COSMOS_DB_NAME} database`);
        console.log(`- Records: ${count}`);
        
        console.log('\n📌 Next Steps:');
        console.log('1. Verify data in Azure Portal → Cosmos DB → Data Explorer');
        console.log('2. Test the bot in Discord to ensure everything works');
        console.log('3. Back up your old birthdays.json file');
        console.log('4. Deploy the application to Azure Web App');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Check if Cosmos DB credentials are configured
if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
    console.error('❌ Error: Cosmos DB credentials not found!');
    console.log('\nPlease configure these in your .env file:');
    console.log('  COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/');
    console.log('  COSMOS_KEY=your_primary_key');
    console.log('  COSMOS_DB_NAME=BirthdayBotDB');
    process.exit(1);
}

console.log('📦 Birthday Bot Migration Tool');
console.log('================================\n');

migrateData();
