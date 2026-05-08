const { CosmosClient } = require('@azure/cosmos');
const config = require('../config');

const SYNC_METADATA_CONTAINER = 'activity_sync_metadata';
const SUMMARY_DOC_ID = 'summary';

class SyncMetadataService {
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
        await database.containers.createIfNotExists({
            id: SYNC_METADATA_CONTAINER,
            partitionKey: { paths: ['/channelId'] }
        });

        this.container = database.container(SYNC_METADATA_CONTAINER);
        this.initialized = true;
    }

    async getChannelState(channelId) {
        await this.initialize();

        try {
            const { resource } = await this.container.item(channelId, channelId).read();
            return resource || null;
        } catch (error) {
            if (error.code === 404) return null;
            throw error;
        }
    }

    async upsertChannelState(state) {
        await this.initialize();

        const payload = {
            id: state.channelId,
            channelId: state.channelId,
            guildId: state.guildId,
            channelName: state.channelName || '',
            lastProcessedMessageId: state.lastProcessedMessageId || null,
            backfillBeforeMessageId: state.backfillBeforeMessageId || null,
            backfillComplete: Boolean(state.backfillComplete),
            lastSyncAt: state.lastSyncAt || null,
            lastError: state.lastError || null,
            processedInLastRun: state.processedInLastRun || 0,
            skippedDuplicatesInLastRun: state.skippedDuplicatesInLastRun || 0
        };

        await this.container.items.upsert(payload);
        return payload;
    }

    async upsertSummary(summary) {
        await this.initialize();

        const payload = {
            id: SUMMARY_DOC_ID,
            channelId: SUMMARY_DOC_ID,
            type: 'summary',
            lastRunAt: summary.lastRunAt || null,
            lastSuccessAt: summary.lastSuccessAt || null,
            isRunning: Boolean(summary.isRunning),
            runReason: summary.runReason || null,
            channelsProcessed: summary.channelsProcessed || 0,
            messagesProcessed: summary.messagesProcessed || 0,
            duplicatesSkipped: summary.duplicatesSkipped || 0,
            errorsCount: summary.errorsCount || 0,
            error: summary.error || null
        };

        await this.container.items.upsert(payload);
        return payload;
    }

    async getSummary() {
        await this.initialize();

        try {
            const { resource } = await this.container.item(SUMMARY_DOC_ID, SUMMARY_DOC_ID).read();
            return resource || null;
        } catch (error) {
            if (error.code === 404) return null;
            throw error;
        }
    }
}

module.exports = new SyncMetadataService();
