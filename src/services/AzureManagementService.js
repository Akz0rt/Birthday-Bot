const { WebSiteManagementClient } = require('@azure/arm-appservice');
const { DefaultAzureCredential } = require('@azure/identity');
const config = require('../config');

class AzureManagementService {
    constructor() {
        this.client = null;
    }

    /**
     * Returns true if all required Azure Management env vars are set.
     */
    isConfigured() {
        return !!(
            config.azureSubscriptionId &&
            config.azureResourceGroup &&
            config.azureWebAppName
        );
    }

    _getClient() {
        if (!this.client) {
            const credential = new DefaultAzureCredential();
            this.client = new WebSiteManagementClient(credential, config.azureSubscriptionId);
        }
        return this.client;
    }

    /**
     * Merges `patch` into Azure App Settings.
     * Reads the current full App Settings from Azure first so that Azure-injected
     * system variables (WEBSITE_RUN_FROM_PACKAGE, SCM_*, etc.) are preserved —
     * updateApplicationSettings is a full replace, not a patch.
     * @param {Record<string, string>} patch
     */
    async updateAppSettings(patch) {
        const client = this._getClient();

        // GET current settings to avoid wiping Azure system variables
        const existing = await client.webApps.listApplicationSettings(
            config.azureResourceGroup,
            config.azureWebAppName
        );

        const merged = { ...(existing.properties || {}), ...patch };

        await client.webApps.updateApplicationSettings(
            config.azureResourceGroup,
            config.azureWebAppName,
            { properties: merged }
        );
    }

    /**
     * Triggers a restart of the App Service.
     */
    async restart() {
        const client = this._getClient();
        await client.webApps.restart(
            config.azureResourceGroup,
            config.azureWebAppName
        );
        console.log('🔄 Azure App Service restart triggered');
    }
}

module.exports = new AzureManagementService();
