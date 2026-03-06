# Quick Setup Guide - Discord Birthday Bot

## Setup Checklist

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Create .env file

Create a file named `.env` in the project root with all 15 variables:

```env
# Discord
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id

# Channels and roles
BIRTHDAY_CHANNEL_ID=channel_id_for_announcements
CONGRATS_CHANNEL_ID=channel_id_for_congrats
AI_CHANNEL_ID=channel_id_for_ai_assistant
MALE_ROLE_ID=role_id_for_male_members
FEMALE_ROLE_ID=role_id_for_female_members

# Scheduler
CHECK_TIME=00:00
TIMEZONE=UTC

# Azure Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_primary_key_from_azure_portal
COSMOS_DB_NAME=BirthdayBotDB

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Enable Message Content Intent in Discord Developer Portal

Without this, the AI assistant cannot read message content.

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Select your application
3. Click **Bot** in the left sidebar
4. Scroll to **Privileged Gateway Intents**
5. Enable **Message Content Intent**
6. Click **Save Changes**

### Step 4: Get Cosmos DB credentials

1. Open [portal.azure.com](https://portal.azure.com)
2. Navigate to your Cosmos DB account
3. Click **Keys** in the left sidebar
4. Copy **URI** into `COSMOS_ENDPOINT` and **PRIMARY KEY** into `COSMOS_KEY`

The endpoint must end with `:443/`.

### Step 5: Register slash commands with Discord

```bash
node src/deploy-commands.js
```

Run this once, or whenever you change command definitions.

### Step 6: Start the bot

```bash
node src/index.js
```

### Step 7: Set Azure App Service environment variables

Use the Azure Portal (App Service -> Configuration -> Application settings) or the Azure CLI:

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
    COSMOS_ENDPOINT="https://your-account.documents.azure.com:443/" \
    COSMOS_KEY="your_key" \
    COSMOS_DB_NAME="BirthdayBotDB" \
    OPENAI_API_KEY="your_openai_key" \
    OPENAI_MODEL="gpt-4o-mini"
```

Restart the app after setting variables:

```bash
az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| AI not responding to @mentions or in channel | Message Content Intent not enabled | Enable it in Discord Developer Portal -> Bot -> Privileged Gateway Intents |
| "Cosmos DB connection failed" | Wrong endpoint or key | Verify `COSMOS_ENDPOINT` ends with `:443/` and `COSMOS_KEY` matches Azure Portal |
| Bot not responding to slash commands | Commands not registered | Run `node src/deploy-commands.js` |
| "Unknown interaction" errors | Stale command definitions | Re-run `node src/deploy-commands.js` |
| Environment variable not found at runtime | Missing from Azure App Service config | Add via Azure Portal or CLI and restart the app |
| Bot offline after deployment | App Service stopped or startup failed | Check logs: `az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app` |

## Quick reference commands

```bash
# View live logs
az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app

# Restart the app
az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app

# Check app status
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query state

# List current app settings
az webapp config appsettings list --resource-group birthday-bot-rg --name birthday-bot-app
```

For full deployment instructions see [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md).
