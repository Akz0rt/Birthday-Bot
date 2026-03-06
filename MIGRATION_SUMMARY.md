# Birthday Bot — Changelog

## v2.0 — AI Assistant (Current)

### What was added

**src/services/AIService.js** (new file)

A conversational AI assistant backed by OpenAI gpt-4o-mini. Key capabilities:
- Responds to @mentions in any channel
- Responds to all messages in the dedicated AI_CHANNEL_ID channel
- Maintains per-channel conversation history (up to 20 messages)
- Uses OpenAI function calling (tool use) to query and update Cosmos DB
- Available tools: query a birthday, list upcoming birthdays, set own birthday
- Permission model: users can only set their own birthday through the AI

**src/index.js** — updated

Added a `messageCreate` event handler that routes messages to AIService when the bot is mentioned or when the message arrives in AI_CHANNEL_ID.

**src/config.js** — updated

Added three new configuration entries:
- `aiChannelId` (from `AI_CHANNEL_ID`)
- `openaiApiKey` (from `OPENAI_API_KEY`)
- `openaiModel` (from `OPENAI_MODEL`, default: `gpt-4o-mini`)

**package.json** — updated

Added `openai` as a production dependency.

### New environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_CHANNEL_ID` | — | Channel where all messages are handled by the AI assistant |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |

### Discord Developer Portal requirement

The Message Content privileged intent must be enabled for the bot to read message content. Without it, the AI assistant receives no text.

Path: Developer Portal -> Application -> Bot -> Privileged Gateway Intents -> Message Content Intent

---

## v1.0 — Azure Cosmos DB (Initial Release)

### What was added

**src/services/CosmosDBService.js** (new file)

Replaced local JSON file storage with Azure Cosmos DB (serverless). Provides:
- `initialize()` — auto-creates database and container if missing
- `setBirthday(userId, month, day)` — upserts a birthday record
- `getBirthday(userId)` — fetches one record
- `getAllBirthdays()` — fetches all records
- `getBirthdaysByDate(month, day)` — date-based query
- `getTodaysBirthdays()` — returns today's celebrants

**src/commands/*.js** — all three commands updated to use CosmosDBService

**src/services/NotificationService.js** — updated to use CosmosDBService

**src/config.js** — added Cosmos DB configuration:
- `cosmosEndpoint` (from `COSMOS_ENDPOINT`)
- `cosmosKey` (from `COSMOS_KEY`)
- `cosmosDbName` (from `COSMOS_DB_NAME`, default: `BirthdayBotDB`)

**package.json** — added `@azure/cosmos` dependency

### New environment variables (v1.0)

| Variable | Default | Description |
|----------|---------|-------------|
| `COSMOS_ENDPOINT` | — | Cosmos DB account URI (must end with `:443/`) |
| `COSMOS_KEY` | — | Cosmos DB primary key |
| `COSMOS_DB_NAME` | `BirthdayBotDB` | Database name |

---

## What Was Removed

The following files existed in earlier development iterations and have been deleted. They are not referenced anywhere in the current codebase or documentation.

| File | Reason for removal |
|------|--------------------|
| `migrate.js` | One-time data migration script from birthdays.json to Cosmos DB. Migration is complete; file no longer needed. |
| `verify-setup.js` | Pre-deployment verification utility. Replaced by the DEPLOYMENT_CHECKLIST.md process. |
| `birthdays.json` | Local JSON birthday storage. All data now lives in Azure Cosmos DB. |
| `run_test.js` | Manual test runner. Removed during cleanup. |

---

## Current Architecture

```
Discord Gateway (discord.js v14)
    |
    |-- Slash commands -> CosmosDBService -> Azure Cosmos DB (serverless)
    |                     BirthdayBotDB / birthdays container / partitioned by /userId
    |
    |-- MessageCreate -> AIService -> OpenAI (gpt-4o-mini) function calling
    |                                   |
    |                                   -> CosmosDBService -> Azure Cosmos DB
    |
    |-- Scheduler (daily) -> CosmosDBService -> NotificationService -> Discord
```

Hosting: Azure App Service B1
Deploys: GitHub Actions on push to main
