# Deployment Checklist - Birthday Bot on Azure

Use this checklist to ensure everything is properly configured before deploying.

## Pre-Deployment Checklist

### Code Preparation
- [ ] `npm install` run locally
- [ ] Application starts without errors: `node src/index.js`
- [ ] Slash commands registered: `node src/deploy-commands.js`
- [ ] All commands work in local testing

### Discord Developer Portal
- [ ] Bot created and invited to the server
- [ ] **Message Content Intent** enabled under Bot > Privileged Gateway Intents
- [ ] Bot token copied to `DISCORD_TOKEN`

### OpenAI Setup
- [ ] OpenAI account created and API key obtained
- [ ] `OPENAI_API_KEY` set in environment configuration
- [ ] `OPENAI_MODEL` set (default: `gpt-4o-mini`)
- [ ] API key has sufficient credits for usage

### Environment Configuration
- [ ] `.env` file created with all 15 required variables
- [ ] `DISCORD_TOKEN` is valid and current
- [ ] `CLIENT_ID` is the application (not bot) client ID
- [ ] `GUILD_ID` is the correct server ID
- [ ] `BIRTHDAY_CHANNEL_ID` set to announcement channel
- [ ] `CONGRATS_CHANNEL_ID` set to congrats channel
- [ ] `AI_CHANNEL_ID` set to dedicated AI assistant channel
- [ ] `MALE_ROLE_ID` and `FEMALE_ROLE_ID` set correctly
- [ ] `CHECK_TIME` set (default: `00:00`)
- [ ] `TIMEZONE` set correctly (default: `UTC`)
- [ ] `COSMOS_ENDPOINT` is in format: `https://account-name.documents.azure.com:443/`
- [ ] `COSMOS_KEY` copied correctly from Azure Portal (Primary Key)
- [ ] `COSMOS_DB_NAME` set to `BirthdayBotDB`
- [ ] `OPENAI_API_KEY` set
- [ ] `OPENAI_MODEL` set to `gpt-4o-mini` (or your chosen model)
- [ ] `.env` is listed in `.gitignore` (never commit it)

### Azure Resources Setup
- [ ] Azure account created
- [ ] Resource group created (e.g., `birthday-bot-rg`)
- [ ] Cosmos DB account created (serverless capacity mode)
- [ ] Database `BirthdayBotDB` created in Cosmos DB
- [ ] Container `birthdays` created with partition key `/userId`
- [ ] Cosmos DB credentials copied to environment configuration

### Code Quality
- [ ] No hardcoded secrets or credentials in source code
- [ ] Error handling present in all database operations
- [ ] `.env` confirmed absent from git history

### Testing — Slash Commands
- [ ] `/birthday-set` opens modal and saves birthday to Cosmos DB
- [ ] `/birthday @user` retrieves and displays birthday correctly
- [ ] `/birthdays-coming` lists upcoming birthdays correctly
- [ ] Notifications send at scheduled time

### Testing — AI Assistant
- [ ] Bot responds when @mentioned in a regular channel
- [ ] Bot responds to all messages in `AI_CHANNEL_ID` channel
- [ ] AI can look up a user's birthday by name
- [ ] AI can list upcoming birthdays
- [ ] AI can set the requesting user's own birthday
- [ ] AI refuses to set another user's birthday (permission enforcement)
- [ ] Conversation history is maintained within a channel session

### Deployment Method Selection
- [ ] Choose deployment method:
  - [ ] **Option A**: GitHub Actions CI/CD (push to main)
  - [ ] **Option B**: Azure CLI zip deploy
  - [ ] **Option C**: Azure Portal UI

### Azure App Service Deployment
- [ ] Azure CLI installed (if using CLI method)
- [ ] `az login` executed successfully
- [ ] App Service Plan created (B1, Linux)
- [ ] Web App created (Node.js 18 LTS)
- [ ] All 15 environment variables configured in Azure App Service
- [ ] Code deployed successfully
- [ ] App Service shows status: "Running"

### Post-Deployment Verification
- [ ] Bot appears online in Discord
- [ ] `/birthday-set` command works in the live server
- [ ] Birthday data visible in Cosmos DB Data Explorer
- [ ] Logs accessible via `az webapp log tail`
- [ ] No errors in application logs
- [ ] AI assistant responds to @mention in the live server
- [ ] AI assistant responds in `AI_CHANNEL_ID` channel
- [ ] Daily notifications work at scheduled time

### Monitoring and Maintenance
- [ ] Application Insights configured (optional)
- [ ] Cosmos DB metrics accessible in Azure Portal
- [ ] Cost monitoring alerts set up
- [ ] Backup strategy decided

## Troubleshooting Items

### If Bot Won't Start
- [ ] Check environment variables: `az webapp config appsettings list --resource-group birthday-bot-rg --name birthday-bot-app`
- [ ] View logs: `az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app`
- [ ] Verify all 15 required env vars are present
- [ ] Restart app: `az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app`

### If AI Assistant Won't Respond
- [ ] Confirm Message Content Intent is enabled in Discord Developer Portal
- [ ] Verify `AI_CHANNEL_ID` matches the channel you are testing in
- [ ] Check `OPENAI_API_KEY` is valid (test at platform.openai.com)
- [ ] Review logs for OpenAI API errors

### If Cosmos DB Connection Fails
- [ ] Verify `COSMOS_ENDPOINT` format (must end with `:443/`)
- [ ] Check `COSMOS_KEY` is the Primary Key (not read-only key)
- [ ] Ensure database `BirthdayBotDB` exists in the Cosmos DB account
- [ ] Ensure container `birthdays` exists with partition key `/userId`

### If Data Not Saving
- [ ] Check Cosmos DB container exists
- [ ] Verify partition key is `/userId`
- [ ] Check RU consumption in Cosmos DB metrics
- [ ] Check error logs for specific error messages

## Rollback Plan

If deployment fails:
1. [ ] Revert code: `git checkout`
2. [ ] Review logs for error messages
3. [ ] Fix identified issues locally
4. [ ] Test locally before redeploying
5. [ ] Scale down Azure resources to save costs while fixing

## Post-Deployment Tasks

### Week 1
- [ ] Monitor bot performance daily
- [ ] Check Cosmos DB RU consumption
- [ ] Verify birthday notifications send on time
- [ ] Monitor error logs
- [ ] Gather user feedback on AI assistant

### Ongoing
- [ ] Monitor costs monthly (~$14–15/month expected)
- [ ] Keep Discord.js and OpenAI SDK updated
- [ ] Rotate Discord token and OpenAI API key periodically
- [ ] Review Azure security practices

## Quick Commands Reference

```bash
# Login
az login

# View app status
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query state

# View logs
az webapp log tail --resource-group birthday-bot-rg --name birthday-bot-app

# Update environment variables
az webapp config appsettings set --resource-group birthday-bot-rg --name birthday-bot-app --settings KEY=VALUE

# Restart app
az webapp restart --resource-group birthday-bot-rg --name birthday-bot-app

# List current settings
az webapp config appsettings list --resource-group birthday-bot-rg --name birthday-bot-app

# Delete all resources (destructive)
az group delete --resource-group birthday-bot-rg
```

## Success Criteria

All items checked = Ready for Production

- Bot is online and responding to slash commands
- Birthdays save to Cosmos DB without errors
- AI assistant responds to @mentions and in AI channel
- AI correctly enforces birthday-setting permissions
- Notifications send at scheduled times
- No sensitive data visible in logs
- Application costs are within ~$14–15/month budget

---

**Status**: [ ] Not Started [ ] In Progress [ ] Complete

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**:
