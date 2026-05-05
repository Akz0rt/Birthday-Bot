const { CosmosClient } = require('@azure/cosmos');
const config = require('../config');

const SETTINGS_CONTAINER = 'settings';
const SETTINGS_DOC_ID = 'config';

class SettingsService {
    constructor() {
        this.client = null;
        this.container = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        this.client = new CosmosClient({
            endpoint: config.cosmosEndpoint,
            key: config.cosmosKey
        });

        const database = this.client.database(config.cosmosDbName);

        // Create settings container if it doesn't exist
        await database.containers.createIfNotExists({
            id: SETTINGS_CONTAINER,
            partitionKey: { paths: ['/id'] }
        });

        this.container = database.container(SETTINGS_CONTAINER);
        this.initialized = true;
    }

    async getSettings() {
        await this.initialize();

        try {
            const { resource } = await this.container
                .item(SETTINGS_DOC_ID, SETTINGS_DOC_ID)
                .read();
            return resource ? resource : {};
        } catch (error) {
            if (error.code === 404) return {};
            console.error('SettingsService.getSettings error:', error);
            throw error;
        }
    }

    async updateSettings(patch) {
        await this.initialize();

        const existing = await this.getSettings();
        const updated = {
            ...existing,
            ...patch,
            id: SETTINGS_DOC_ID
        };

        // Remove Cosmos DB system fields from the patch to avoid conflicts
        delete updated._rid;
        delete updated._self;
        delete updated._etag;
        delete updated._attachments;
        delete updated._ts;

        await this.container.items.upsert(updated);
        return updated;
    }
}

module.exports = new SettingsService();
