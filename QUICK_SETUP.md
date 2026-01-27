# Quick Azure Setup Guide - Birthday Bot

## One-Time Setup Before Deployment

### 1. Create .env File with Azure Credentials

Add these to your `.env` file:

```env
# Existing Discord Configuration
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
BIRTHDAY_CHANNEL_ID=your_channel_id
CONGRATS_CHANNEL_ID=your_congrats_channel_id
TIMEZONE=UTC
CHECK_TIME=07:00
MALE_ROLE_ID=your_role_id
FEMALE_ROLE_ID=your_role_id

# Azure Cosmos DB (Copy from Azure Portal)
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your_primary_key_from_azure
COSMOS_DB_NAME=BirthdayBotDB
```

### 2. Get Cosmos DB Credentials

1. Open [Azure Portal](https://portal.azure.com)
2. Go to your Cosmos DB account
3. Click **Keys** on the left
4. Copy:
   - **URI** → `COSMOS_ENDPOINT` (keep the `:443/` part)
   - **PRIMARY KEY** → `COSMOS_KEY`

### 3. Migrate Existing Data (if you have birthdays.json)

```bash
npm install
npm run migrate
```

This will transfer all birthdays from `birthdays.json` to Cosmos DB.

### 4. Install Azure CLI (for deployment)

```bash
# Windows
https://aka.ms/installazurecliwindows

# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 5. Deploy to Azure

```bash
# Login to Azure
az login

# Create resource group
az group create --name birthday-bot-rg --location eastus

# Create App Service Plan
az appservice plan create --name birthday-bot-plan --resource-group birthday-bot-rg --sku B1 --is-linux

# Create Web App
az webapp create --resource-group birthday-bot-rg --plan birthday-bot-plan --name birthday-bot-app --runtime "node|18-lts"

# Set environment variables
az webapp config appsettings set --resource-group birthday-bot-rg --name birthday-bot-app --settings \
  DISCORD_TOKEN="your_token" \
  CLIENT_ID="your_client_id" \
  GUILD_ID="your_guild_id" \
  BIRTHDAY_CHANNEL_ID="your_channel_id" \
  CONGRATS_CHANNEL_ID="your_congrats_channel_id" \
  TIMEZONE="UTC" \
  CHECK_TIME="07:00" \
  MALE_ROLE_ID="your_role_id" \
  FEMALE_ROLE_ID="your_role_id" \
  COSMOS_ENDPOINT="your_cosmos_endpoint" \
  COSMOS_KEY="your_cosmos_key" \
  COSMOS_DB_NAME="BirthdayBotDB" \
  NODE_ENV="production"

# Deploy code
cd /path/to/your/project
zip -r app.zip . -x "node_modules/*" ".git/*" ".env"
az webapp deployment source config-zip --resource-group birthday-bot-rg --name birthday-bot-app --src ./app.zip
```

### 6. Verify Deployment

```bash
# Check if app is running
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query state

# View logs
az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app

# Get app URL
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query defaultHostName
```

### 7. Test in Discord

- Invite your bot to the server
- Run `/birthday-set` command
- Check [Azure Portal](https://portal.azure.com) → Cosmos DB → Data Explorer to verify data

## Common Issues

| Issue | Solution |
|-------|----------|
| "Cosmos DB connection failed" | Check COSMOS_ENDPOINT ends with `:443/` and COSMOS_KEY is correct |
| "Bot not responding" | Check logs: `az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app` |
| "Environment variables not found" | Restart app: `az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app` |
| "Migration fails" | Ensure birthdays.json exists and .env has Cosmos credentials |

## Cleanup

To remove all Azure resources:

```bash
az group delete --name birthday-bot-rg
```

## Cost

- **App Service (B1)**: $0.01/hour (~$7-12/month)
- **Cosmos DB (free tier)**: Free for first 400 RU/s
- **Total**: ~$7-50/month

See [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) for detailed setup.
