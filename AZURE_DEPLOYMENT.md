# Azure Web App Deployment Guide - Birthday Bot

This guide provides step-by-step instructions to deploy the Discord Birthday Bot on Azure App Service, using Azure Cosmos DB for storage.

## Prerequisites

- Azure account
- Azure CLI installed
- Git installed
- Node.js 18+ installed
- Discord bot token and credentials
- OpenAI API key

## Architecture Overview

- **Hosting**: Azure App Service (B1 tier)
- **Database**: Azure Cosmos DB (serverless, NoSQL)
- **AI**: OpenAI API (gpt-4o-mini)
- **CI/CD**: GitHub Actions (auto-deploy on push to main)

## Part 1: Set Up Azure Cosmos DB

### Step 1: Create Cosmos DB Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Azure Cosmos DB" and select it
4. Click "Create" and choose "Azure Cosmos DB for NoSQL"

### Step 2: Configure Cosmos DB

Fill in the creation form:

- **Subscription**: Select your subscription
- **Resource Group**: Create new (e.g., `birthday-bot-rg`)
- **Account Name**: e.g., `birthday-bot-cosmos` (must be globally unique)
- **Location**: Choose your nearest region
- **Capacity mode**: Select "Serverless"

Click "Review + Create" then "Create". Deployment takes 5-10 minutes.

### Step 3: Get Cosmos DB Connection Details

1. Go to your Cosmos DB account
2. Click "Keys" in the left sidebar
3. Copy:
   - **URI** into `COSMOS_ENDPOINT` (keep the `:443/` at the end)
   - **PRIMARY KEY** into `COSMOS_KEY`

### Step 4: Create Database and Container

1. Go to "Data Explorer"
2. Click "New Container"
3. Fill in:
   - **Database ID**: `BirthdayBotDB`
   - **Container ID**: `birthdays`
   - **Partition key**: `/userId`
4. Click "OK"

## Part 2: Prepare Your Application

### Step 1: Update Environment Variables

Create or update your `.env` file:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
BIRTHDAY_CHANNEL_ID=your_channel_id_here
CONGRATS_CHANNEL_ID=your_congrats_channel_id_here
AI_CHANNEL_ID=your_ai_channel_id_here
MALE_ROLE_ID=your_male_role_id_here
FEMALE_ROLE_ID=your_female_role_id_here
CHECK_TIME=00:00
TIMEZONE=UTC

# Azure Cosmos DB Configuration
COSMOS_ENDPOINT=https://your-cosmosdb-name.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key_here
COSMOS_DB_NAME=BirthdayBotDB

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Step 2: Enable Message Content Intent

The AI assistant requires the Message Content privileged intent to read messages.

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Select your application
3. Click **Bot** in the left sidebar
4. Under **Privileged Gateway Intents**, enable **Message Content Intent**
5. Click **Save Changes**

If this intent is not enabled, the bot will start but the AI assistant will not respond to messages.

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Register Slash Commands

```bash
node src/deploy-commands.js
```

### Step 5: Test Locally (Optional)

```bash
node src/index.js
```

## Part 3: Deploy to Azure App Service

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
    AI_CHANNEL_ID="your_ai_channel_id" \
    MALE_ROLE_ID="your_male_role_id" \
    FEMALE_ROLE_ID="your_female_role_id" \
    CHECK_TIME="00:00" \
    TIMEZONE="UTC" \
    COSMOS_ENDPOINT="your_cosmos_endpoint" \
    COSMOS_KEY="your_cosmos_key" \
    COSMOS_DB_NAME="BirthdayBotDB" \
    OPENAI_API_KEY="your_openai_api_key" \
    OPENAI_MODEL="gpt-4o-mini" \
    NODE_ENV="production"
```

#### Step 4: Deploy Code

Create a zip file and deploy:

```bash
# On Windows PowerShell
Compress-Archive -Path ./* -DestinationPath app.zip -Force

# On macOS/Linux
zip -r app.zip . -x "node_modules/*" ".git/*" ".env"
```

```bash
az webapp deployment source config-zip \
  --resource-group birthday-bot-rg \
  --name birthday-bot-app \
  --src ./app.zip
```

### Option B: GitHub Actions (CI/CD)

The repository includes GitHub Actions workflows in `.github/workflows/` that automatically deploy to Azure App Service on every push to the `main` branch. To use this:

1. Set the required GitHub Actions secrets in your repository settings
2. Push to `main` — deployment happens automatically

### Option C: Using Azure Portal UI

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new App Service
3. Configure: Name, Node.js 18 LTS runtime, your region
4. After creation, go to Deployment Center and configure your source
5. Set environment variables in Configuration > Application settings

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

1. Invite the bot to your Discord server
2. Run `/birthday-set` — a modal should appear
3. Check Cosmos DB in Azure Portal > Data Explorer to confirm data is saved
4. Run `/birthday @yourself` to verify retrieval
5. Run `/birthdays-coming` to list upcoming birthdays
6. Test the AI assistant: @mention the bot with a question like "@BirthdayBot when is my birthday?"
7. Send a message in `AI_CHANNEL_ID` without a mention — the bot should respond

## Part 5: Monitoring and Maintenance

### Set Up Application Insights (Optional)

```bash
az monitor app-insights component create \
  --app birthday-bot-insights \
  --resource-group birthday-bot-rg \
  --location eastus
```

### Monitor Cosmos DB Costs

- Go to Cosmos DB > Metrics in Azure Portal
- Monitor RU (Request Units) consumption
- Serverless billing is per RU consumed — there is no minimum cost

### View Bot Logs

In Azure Portal: App Service > Log stream

## Troubleshooting

### Bot Not Starting

```bash
az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app
```

Common causes:
- Missing environment variables — check Configuration section in Azure Portal
- Invalid Cosmos DB credentials — verify `COSMOS_ENDPOINT` and `COSMOS_KEY`
- Invalid OpenAI API key — verify `OPENAI_API_KEY`

### AI Assistant Not Responding

- Confirm Message Content Intent is enabled in Discord Developer Portal
- Check `AI_CHANNEL_ID` is set to the correct channel ID
- Verify `OPENAI_API_KEY` is valid and has sufficient credits

### Database Connection Failed

1. Verify `COSMOS_ENDPOINT` format — must end with `:443/`
2. Check `COSMOS_KEY` is correct (Primary Key, not read-only)
3. Confirm the `birthdays` container exists in database `BirthdayBotDB`
4. Confirm partition key is `/userId`

## Scaling Considerations

### Vertical Scaling (Larger Instance)

Update SKU in Azure Portal: App Service Plan > Scale up

### Horizontal Scaling (More Instances)

```bash
az appservice plan update \
  --name birthday-bot-plan \
  --resource-group birthday-bot-rg \
  --sku S1
```

Note: Discord bots are stateful (WebSocket connection). Running multiple instances requires additional coordination. For a small server, a single B1 instance is sufficient.

## Useful Commands

```bash
# List all resources in the group
az resource list --resource-group birthday-bot-rg

# Restart web app
az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app

# Get app URL
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query "defaultHostName"

# Delete everything (destructive)
az group delete --resource-group birthday-bot-rg
```

## Cost Estimation

| Component | Estimated Cost |
|-----------|---------------|
| App Service Plan (B1) | ~$13/month |
| Cosmos DB serverless | ~$0–1/month |
| OpenAI gpt-4o-mini (small server) | ~$0.10–1/month |
| **Total** | **~$14–15/month** |

*Check [Azure Pricing](https://azure.microsoft.com/en-us/pricing/) and [OpenAI Pricing](https://openai.com/pricing) for current rates.*

## Security Best Practices

1. Never commit `.env` to Git
2. Use Azure Key Vault for production secrets if needed
3. Regularly rotate your Discord token and OpenAI API key
4. Review Cosmos DB access logs periodically
5. Store all credentials as Azure App Service Application Settings, not in code

## Support Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Azure Cosmos DB Docs](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Azure App Service Docs](https://docs.microsoft.com/en-us/azure/app-service/)
- [OpenAI API Docs](https://platform.openai.com/docs/)
