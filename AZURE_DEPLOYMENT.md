# Azure Web App Deployment Guide - Birthday Bot

This guide provides step-by-step instructions to deploy your Discord Birthday Bot on Azure as a Web App, using Azure Cosmos DB for birthday storage.

## Prerequisites

- Azure Account (Free tier available)
- Azure CLI installed locally
- Git installed
- Node.js 18+ installed
- Your Discord bot token and credentials

## Architecture Overview

- **Hosting**: Azure Web App (App Service)
- **Database**: Azure Cosmos DB (NoSQL)
- **Container**: Docker (optional but recommended)
- **Scaling**: Automatic with App Service Plan

## Part 1: Set Up Azure Cosmos DB

### Step 1: Create Cosmos DB Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Azure Cosmos DB"
4. Select "Azure Cosmos DB"
5. Click "Create"

### Step 2: Configure Cosmos DB

1. Fill in the form:
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new (e.g., `birthday-bot-rg`)
   - **Account Name**: e.g., `birthday-bot-cosmos` (must be globally unique)
   - **Location**: Choose nearest region
   - **Capacity mode**: Select "Provisioned throughput"
   - **Apply Free Tier Discount**: Check if eligible

2. Click "Review + Create" → "Create"

3. Wait for deployment (usually 5-10 minutes)

### Step 3: Get Cosmos DB Connection Details

1. Go to your Cosmos DB account
2. Click "Keys" in the left sidebar
3. Copy:
   - **URI**: This is your `COSMOS_ENDPOINT`
   - **PRIMARY KEY**: This is your `COSMOS_KEY`

### Step 4: Create Database and Container

1. Go to "Data Explorer"
2. Click "New Container"
3. Fill in:
   - **Database ID**: `BirthdayBotDB` (or your preferred name)
   - **Container ID**: `birthdays`
   - **Partition key**: `/userId`
   - **Throughput**: 400 RU/s (free tier eligible)

4. Click "OK"

## Part 2: Prepare Your Application

### Step 1: Update Environment Variables

Open `.env` file and add:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
BIRTHDAY_CHANNEL_ID=your_channel_id_here
CONGRATS_CHANNEL_ID=your_congrats_channel_id_here
TIMEZONE=UTC
CHECK_TIME=07:00
MALE_ROLE_ID=your_male_role_id_here
FEMALE_ROLE_ID=your_female_role_id_here

# Azure Cosmos DB Configuration
COSMOS_ENDPOINT=https://your-cosmosdb-name.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key_here
COSMOS_DB_NAME=BirthdayBotDB
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs `@azure/cosmos` and other required packages.

### Step 3: Test Locally (Optional)

```bash
npm run dev
```

## Part 3: Deploy to Azure Web App

### Option A: Using Azure CLI (Recommended)

#### Step 1: Create App Service Plan

```bash
az appservice plan create \
  --name birthday-bot-plan \
  --resource-group birthday-bot-rg \
  --sku B1 \
  --is-linux
```

#### Step 2: Create Web App

```bash
az webapp create \
  --resource-group birthday-bot-rg \
  --plan birthday-bot-plan \
  --name birthday-bot-app \
  --runtime "node|18-lts"
```

#### Step 3: Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group birthday-bot-rg \
  --name birthday-bot-app \
  --settings \
    DISCORD_TOKEN="your_token" \
    CLIENT_ID="your_client_id" \
    GUILD_ID="your_guild_id" \
    BIRTHDAY_CHANNEL_ID="your_channel_id" \
    CONGRATS_CHANNEL_ID="your_congrats_channel_id" \
    TIMEZONE="UTC" \
    CHECK_TIME="07:00" \
    MALE_ROLE_ID="your_male_role_id" \
    FEMALE_ROLE_ID="your_female_role_id" \
    COSMOS_ENDPOINT="your_cosmos_endpoint" \
    COSMOS_KEY="your_cosmos_key" \
    COSMOS_DB_NAME="BirthdayBotDB" \
    NODE_ENV="production"
```

#### Step 4: Deploy Code

##### Method A: Git Deployment

```bash
az webapp deployment source config-zip \
  --resource-group birthday-bot-rg \
  --name birthday-bot-app \
  --src ./app.zip
```

First, create the zip file:

```bash
# On Windows PowerShell
Compress-Archive -Path ./* -DestinationPath app.zip

# On macOS/Linux
zip -r app.zip . -x "node_modules/*" ".git/*"
```

##### Method B: Direct Git Push

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Add Azure remote
az webapp deployment source config-local-git \
  --resource-group birthday-bot-rg \
  --name birthday-bot-app

# Follow the git push command provided
```

### Option B: Using Docker Container

#### Step 1: Create Container Registry (if not already done)

```bash
az acr create \
  --resource-group birthday-bot-rg \
  --name birthdaybot \
  --sku Basic
```

#### Step 2: Build Docker Image

```bash
az acr build \
  --registry birthdaybot \
  --image birthday-bot:latest \
  .
```

#### Step 3: Deploy Docker Image

```bash
az webapp create \
  --resource-group birthday-bot-rg \
  --plan birthday-bot-plan \
  --name birthday-bot-app \
  --deployment-container-image-name birthdaybot.azurecr.io/birthday-bot:latest
```

### Option B: Using Azure Portal UI

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new App Service
3. Configure:
   - **Name**: birthday-bot-app
   - **Runtime**: Node.js 18 LTS
   - **Region**: Your preferred region
4. Click "Create"
5. After creation:
   - Go to Deployment Center
   - Choose your source (GitHub, Local Git, Zip)
   - Configure environment variables in Configuration section
   - Deploy

## Part 4: Verify Deployment

### Check App Status

```bash
az webapp show \
  --resource-group birthday-bot-rg \
  --name birthday-bot-app \
  --query "state"
```

### View Logs

```bash
az webapp log tail \
  --resource-group birthday-bot-rg \
  --name birthday-bot-app
```

### Test the Bot

1. Invite bot to your Discord server
2. Use `/birthday-set` command in Discord
3. Check Cosmos DB in Azure Portal → Data Explorer to confirm data is saved

## Part 5: Data Migration (if migrating from birthdays.json)

If you have existing birthday data in `birthdays.json`:

### Step 1: Create Migration Script

Create `migrate.js`:

```javascript
const fs = require('fs').promises;
const CosmosDBService = require('./src/services/CosmosDBService');

async function migrate() {
    try {
        const data = await fs.readFile('birthdays.json', 'utf8');
        const birthdays = JSON.parse(data);
        
        await CosmosDBService.migrateFromJson(birthdays);
        console.log('✅ Migration complete!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

migrate();
```

### Step 2: Run Migration Locally

```bash
node migrate.js
```

Or run it in Azure by SSH/Kudu console:

1. Go to App Service → SSH
2. Run: `node migrate.js`

## Part 6: Monitoring and Maintenance

### Set Up Application Insights

```bash
az monitor app-insights component create \
  --app birthday-bot-insights \
  --resource-group birthday-bot-rg \
  --location eastus
```

### Monitor Cosmos DB Costs

- Go to Cosmos DB → Metrics
- Monitor RU (Request Units) consumption
- Adjust throughput if needed

### View Bot Logs

In Azure Portal:
1. Go to App Service → Log stream
2. Observe real-time logs

## Troubleshooting

### Bot Not Starting

Check logs:
```bash
az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app
```

Common issues:
- Missing environment variables → Check Configuration section
- Invalid Cosmos DB credentials → Verify COSMOS_ENDPOINT and COSMOS_KEY

### Database Connection Failed

1. Verify Cosmos DB is running
2. Check COSMOS_ENDPOINT format (should have :443/ at the end)
3. Verify COSMOS_KEY is correct
4. Check firewall settings if needed

### High Costs

- Increase Cosmos DB throughput gradually
- Use autoscale for variable workloads
- Monitor Request Units (RUs) in metrics

## Scaling Considerations

### Horizontal Scaling (More Instances)

```bash
az appservice plan update \
  --name birthday-bot-plan \
  --resource-group birthday-bot-rg \
  --sku S1
```

### Vertical Scaling (Larger Instance)

Update SKU in Azure Portal: App Service Plan → Scale up

## Useful Commands

```bash
# List all resources
az resource list --resource-group birthday-bot-rg

# Restart web app
az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app

# Delete everything
az group delete --resource-group birthday-bot-rg

# Get app URL
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query "defaultHostName"
```

## Cost Estimation

- **App Service Plan (B1)**: ~$12/month
- **Cosmos DB (400 RU/s)**: ~$0.05/hour (~$36/month)
- **Total**: ~$48/month for small usage

*Note: Check Azure Pricing for current rates*

## Security Best Practices

1. ✅ Never commit `.env` to Git
2. ✅ Use Azure Key Vault for sensitive data
3. ✅ Enable authentication on Web App if needed
4. ✅ Regularly rotate Discord token
5. ✅ Review Cosmos DB access logs
6. ✅ Use managed identities where possible

## Next Steps

1. Test the bot thoroughly in your Discord server
2. Set up monitoring and alerts
3. Create backup procedures for Cosmos DB
4. Plan scaling strategy as user base grows
5. Review Azure Cost Management reports

## Support

- [Azure Discord.js Documentation](https://discord.js.org/)
- [Azure Cosmos DB Docs](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Azure App Service Docs](https://docs.microsoft.com/en-us/azure/app-service/)

---

**Happy Birthday Bot Celebrating!** 🎉🎂
