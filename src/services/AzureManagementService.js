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
     * Reconstructs the full settings object from process.env (already injected by Azure at
     * startup) to avoid reading secrets over the Management API wire.
     * @param {Record<string, string>} patch
     * @param {string[]} knownKeys  All setting keys managed by this app
     */
    async updateAppSettings(patch, knownKeys) {
        const client = this._getClient();

        // Build full settings from process.env — no Management API GET needed,
        // secrets never travel over the wire.
        const current = {};
        for (const key of knownKeys) {
            const val = process.env[key];
            if (val !== undefined) current[key] = val;
        }

        const merged = { ...current, ...patch };

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
