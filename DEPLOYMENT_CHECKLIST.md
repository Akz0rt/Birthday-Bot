# Deployment Checklist - Birthday Bot on Azure

Use this checklist to ensure everything is properly configured before deploying.

## Pre-Deployment Checklist

### Code Preparation
- [ ] All files updated to use `CosmosDBService` instead of `BirthdayService`
- [ ] `package.json` updated with `@azure/cosmos` dependency
- [ ] `npm install` run locally
- [ ] Application starts without errors: `npm run dev`
- [ ] All commands work in local testing

### Environment Configuration
- [ ] `.env` file created with all required variables
- [ ] `COSMOS_ENDPOINT` is in format: `https://account-name.documents.azure.com:443/`
- [ ] `COSMOS_KEY` copied correctly from Azure Portal
- [ ] `COSMOS_DB_NAME` set to `BirthdayBotDB` (or your chosen name)
- [ ] Discord token is valid and current
- [ ] All Discord IDs are correct (GUILD_ID, CHANNEL_IDs, ROLE_IDs)
- [ ] Timezone is set correctly (default: UTC)
- [ ] Check time is set (default: 07:00)
- [ ] `.env` is listed in `.gitignore` (never commit it!)

### Azure Resources Setup
- [ ] Azure Account created
- [ ] Resource Group created (e.g., `birthday-bot-rg`)
- [ ] Cosmos DB Account created
- [ ] Database `BirthdayBotDB` created in Cosmos DB
- [ ] Container `birthdays` created with partition key `/userId`
- [ ] Cosmos DB throughput set (400 RU/s is free tier eligible)
- [ ] Cosmos DB credentials copied to `.env`

### Data Migration (if applicable)
- [ ] `birthdays.json` exists with user birthdays
- [ ] `npm run migrate` command executed successfully
- [ ] Data verified in Azure Portal → Cosmos DB → Data Explorer
- [ ] Migration log shows all records transferred
- [ ] Old `birthdays.json` backed up

### Code Quality
- [ ] No hardcoded secrets or credentials in code
- [ ] Error handling present in all database operations
- [ ] Logging statements added for debugging
- [ ] Comments explain complex logic
- [ ] Code follows existing project style

### Testing
- [ ] Bot invoked with `/birthday-set` command
- [ ] Birthday data saved in Cosmos DB
- [ ] `/birthday` command retrieves data correctly
- [ ] `/birthdays-coming` lists upcoming birthdays
- [ ] Notifications work at scheduled time
- [ ] Error handling works (e.g., invalid dates)

### Deployment Method Selection
- [ ] Choose deployment method:
  - [ ] **Option A**: Azure CLI (recommended for first-time)
  - [ ] **Option B**: Docker Container
  - [ ] **Option C**: Azure Portal UI

### Azure CLI Deployment (if Option A selected)
- [ ] Azure CLI installed
- [ ] `az login` executed successfully
- [ ] Azure CLI defaults set correctly
- [ ] App Service Plan created
- [ ] Web App created
- [ ] Environment variables configured in Azure
- [ ] Code deployed (via zip or git)
- [ ] Deployment successful

### Docker Deployment (if Option B selected)
- [ ] Docker installed locally
- [ ] `Dockerfile` exists and configured
- [ ] Azure Container Registry created
- [ ] Docker image built successfully
- [ ] Image pushed to ACR
- [ ] Web App configured to use container
- [ ] Container started successfully

### Post-Deployment Verification
- [ ] Web App is running (status: "Running")
- [ ] Bot appears online in Discord
- [ ] `/birthday-set` command works
- [ ] Data saves to Cosmos DB
- [ ] Logs accessible via `az webapp log tail`
- [ ] No errors in application logs
- [ ] Daily notifications work at scheduled time

### Monitoring & Maintenance
- [ ] Application Insights configured (optional)
- [ ] Cosmos DB metrics accessible
- [ ] Cost monitoring alerts set up
- [ ] Backup strategy decided
- [ ] Scaling plan understood

### Documentation
- [ ] `AZURE_DEPLOYMENT.md` read and understood
- [ ] `QUICK_SETUP.md` bookmarked for reference
- [ ] Team notified of deployment
- [ ] Discord members informed of new features

## Troubleshooting Items

### If Bot Won't Start
- [ ] Check environment variables: `az webapp config appsettings list`
- [ ] View logs: `az webapp log tail`
- [ ] Verify all required env vars are present
- [ ] Check Cosmos DB credentials format
- [ ] Restart app: `az webapp restart`

### If Cosmos DB Connection Fails
- [ ] Verify COSMOS_ENDPOINT format (should end with `:443/`)
- [ ] Check COSMOS_KEY is not expired
- [ ] Ensure database exists in Cosmos DB account
- [ ] Ensure container exists in database
- [ ] Check firewall rules allow connection

### If Data Not Saving
- [ ] Check Cosmos DB container exists
- [ ] Verify partition key is `/userId`
- [ ] Check RU consumption in metrics
- [ ] Ensure write permissions enabled
- [ ] Check error logs for specific errors

### If Migration Fails
- [ ] Verify `birthdays.json` exists and is valid JSON
- [ ] Check Cosmos DB credentials are correct
- [ ] Run migration in verbose mode: `npm run migrate 2>&1`
- [ ] Ensure database exists before migration
- [ ] Ensure container exists before migration

## Rollback Plan

If deployment fails:
1. [ ] Revert code changes: `git checkout`
2. [ ] Scale down Azure resources to save costs
3. [ ] Review logs for error messages
4. [ ] Fix identified issues
5. [ ] Test locally before redeploying

## Post-Deployment Tasks

### Week 1
- [ ] Monitor bot performance daily
- [ ] Check Cosmos DB RU consumption
- [ ] Verify notifications send on time
- [ ] Monitor error logs
- [ ] Gather user feedback

### Week 2-4
- [ ] Optimize Cosmos DB throughput if needed
- [ ] Set up automated backups
- [ ] Document any issues encountered
- [ ] Plan scaling if needed

### Ongoing
- [ ] Monitor costs monthly
- [ ] Update documentation
- [ ] Keep Discord.js updated
- [ ] Keep Azure SDK updated
- [ ] Review security practices

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

# View app URL
az webapp show --resource-group birthday-bot-rg --name birthday-bot-app --query defaultHostName

# Delete all resources
az group delete --resource-group birthday-bot-rg
```

## Success Criteria

✅ All items checked = Ready for Production

- Bot is online and responding to commands
- Birthdays save to Cosmos DB without errors
- Notifications send at scheduled times
- No sensitive data visible in logs
- Application performance is acceptable
- Costs are within budget

---

**Status**: [ ] Not Started [ ] In Progress [ ] Complete

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**: 
