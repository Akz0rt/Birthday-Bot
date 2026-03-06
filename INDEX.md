# Birthday Bot — Project Index

## What the Bot Does

A Discord bot for a single server that:
- Lets members register their birthday via slash command or AI chat
- Announces birthdays in a designated channel on the day
- Assigns birthday roles on the day
- Lists upcoming birthdays on request
- Provides a conversational AI assistant that understands and queries birthday data

## Quick Navigation

| Goal | Document |
|------|----------|
| First time setting up the bot | [QUICK_SETUP.md](QUICK_SETUP.md) |
| Full Azure deployment walkthrough | [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) |
| Pre-launch verification checklist | [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) |
| Full feature overview and env vars | [README.md](README.md) |
| File and code reference | [FILE_REFERENCE.md](FILE_REFERENCE.md) |
| Changelog / what was added or removed | [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) |

## Architecture Overview

```
Azure App Service (Node.js 18)
    |
    |-- Discord Gateway (discord.js v14)
    |       |
    |       |-- Slash command interaction
    |       |       commands/birthday-set.js
    |       |       commands/birthday.js
    |       |       commands/birthdays-coming.js
    |       |                |
    |       |                v
    |       |       services/CosmosDBService.js
    |       |                |
    |       |                v
    |       |       Azure Cosmos DB (serverless)
    |       |       Database: BirthdayBotDB
    |       |       Container: birthdays (partitioned by /userId)
    |       |
    |       |-- MessageCreate event
    |               |
    |               v
    |       services/AIService.js
    |               |
    |               |-- Conversation history (per channel, 20 msgs)
    |               |
    |               v
    |       OpenAI API (gpt-4o-mini)
    |       Function calling tools:
    |         - queryBirthday
    |         - listUpcomingBirthdays
    |         - setOwnBirthday
    |               |
    |               v
    |       services/CosmosDBService.js
    |               |
    |               v
    |       Azure Cosmos DB
    |
    |-- SchedulerService
            Daily cron at CHECK_TIME/TIMEZONE
            -> CosmosDBService.getTodaysBirthdays()
            -> NotificationService (announce + role)
```

## Data Flow

### Slash command path

```
User issues /birthday-set, /birthday, or /birthdays-coming
  -> commands/*.js validates input
  -> CosmosDBService reads or writes Cosmos DB
  -> Discord interaction reply sent back to user
```

### AI assistant path

```
User @mentions bot or sends message in AI_CHANNEL_ID
  -> index.js MessageCreate handler
  -> AIService.handleMessage(message)
  -> Conversation history retrieved (per channel)
  -> OpenAI chat completion called with tool definitions
  -> If OpenAI calls a tool:
       -> CosmosDBService executes the query or write
       -> Result returned to OpenAI for final response
  -> Final text response posted in Discord channel
```

### Scheduler path

```
Daily at CHECK_TIME (timezone: TIMEZONE)
  -> SchedulerService triggers
  -> CosmosDBService.getTodaysBirthdays()
  -> NotificationService.sendBirthdayAnnouncement()
     -> Posts to BIRTHDAY_CHANNEL_ID and CONGRATS_CHANNEL_ID
     -> Assigns MALE_ROLE_ID or FEMALE_ROLE_ID to celebrant
```

## Current Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| discord.js | v14 | Discord API client |
| @azure/cosmos | ^4.x | Azure Cosmos DB SDK |
| openai | latest | OpenAI API client |
| node-cron | latest | Birthday check scheduler |
| dotenv | latest | .env file loader |

## Environment Variables Summary

15 variables required. See [README.md](README.md) for full table or [QUICK_SETUP.md](QUICK_SETUP.md) for the .env template.

New in v2.0: `AI_CHANNEL_ID`, `OPENAI_API_KEY`, `OPENAI_MODEL`
