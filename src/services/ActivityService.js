const { CosmosClient } = require('@azure/cosmos');
const config = require('../config');

const ACTIVITY_CONTAINER = 'activity';
const ACTIVITY_MESSAGES_CONTAINER = 'activity_messages';

class ActivityService {
    constructor() {
        this.client = null;
        this.container = null;
        this.messagesContainer = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        this.client = new CosmosClient({
            endpoint: config.cosmosEndpoint,
            key: config.cosmosKey
        });

        const database = this.client.database(config.cosmosDbName);

        // Create activity container if it doesn't exist
        await database.containers.createIfNotExists({
            id: ACTIVITY_CONTAINER,
            partitionKey: { paths: ['/userId'] }
        });

        await database.containers.createIfNotExists({
            id: ACTIVITY_MESSAGES_CONTAINER,
            partitionKey: { paths: ['/channelId'] }
        });

        this.container = database.container(ACTIVITY_CONTAINER);
        this.messagesContainer = database.container(ACTIVITY_MESSAGES_CONTAINER);
        this.initialized = true;
    }

    /**
     * Record a user message
     * @param {string} userId - Discord user ID
     * @param {string} displayName - User display name
     * @param {string} avatarURL - User avatar URL
     */
    async recordMessage(userId, displayName, avatarURL) {
        return this.recordMessageById({
            userId,
            displayName,
            avatarURL,
            timestamp: Date.now()
        });
    }

    /**
     * Record activity for a message id. Returns false when the same message was already counted.
     * @param {{ userId: string, displayName: string, avatarURL: string|null, messageId?: string, channelId?: string, timestamp?: number }} params
     * @returns {Promise<boolean>}
     */
    async recordMessageById(params) {
        await this.initialize();

        const timestamp = params.timestamp || Date.now();
        const date = new Date(timestamp).toISOString().split('T')[0];
        const docId = `${params.userId}-${date}`;

        if (params.messageId && params.channelId) {
            const dedupInserted = await this._insertDedupMessage({
                channelId: params.channelId,
                messageId: params.messageId,
                userId: params.userId,
                date
            });

            if (!dedupInserted) {
                return false;
            }
        }

        try {
            const { resource } = await this.container.item(docId, params.userId).read();
            const base = resource || {
                id: docId,
                userId: params.userId,
                date,
                displayName: params.displayName,
                avatarURL: params.avatarURL,
                messageCount: 0,
                lastMessageTime: timestamp
            };

            base.messageCount = (base.messageCount || 0) + 1;
            base.lastMessageTime = timestamp;
            base.displayName = params.displayName;
            base.avatarURL = params.avatarURL;

            delete base._rid;
            delete base._self;
            delete base._etag;
            delete base._attachments;
            delete base._ts;

            await this.container.items.upsert(base);
            return true;
        } catch (error) {
            if (error.code === 404) {
                const newRecord = {
                    id: docId,
                    userId: params.userId,
                    date,
                    displayName: params.displayName,
                    avatarURL: params.avatarURL,
                    messageCount: 1,
                    lastMessageTime: timestamp
                };

                await this.container.items.create(newRecord);
                return true;
            }

            console.error('ActivityService.recordMessageById error:', error);
            throw error;
        }
    }

    async _insertDedupMessage({ channelId, messageId, userId, date }) {
        try {
            await this.messagesContainer.items.create({
                id: `${channelId}-${messageId}`,
                channelId,
                messageId,
                userId,
                date,
                createdAt: Date.now()
            });
            return true;
        } catch (error) {
            if (error.code === 409) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Get top active users for a period
     * @param {number} days - Number of days to look back
     * @returns {Array} Array of { userId, displayName, avatarURL, messageCount }
     */
    async getTopUsersByPeriod(days = 7) {
        await this.initialize();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        try {
            const query = `
                SELECT c.userId, c.displayName, c.avatarURL, 
                       SUM(c.messageCount) as totalMessages
                FROM c
                WHERE c.date >= @cutoffDate
                GROUP BY c.userId, c.displayName, c.avatarURL
                ORDER BY totalMessages DESC
            `;

            const { resources } = await this.container.items
                .query(query, { parameters: [{ name: '@cutoffDate', value: cutoffString }] })
                .fetchAll();

            return resources;
        } catch (error) {
            console.error('ActivityService.getTopUsersByPeriod error:', error);
            throw error;
        }
    }

    /**
     * Clean up activity records older than 30 days
     */
    async cleanupOldData() {
        await this.initialize();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        try {
            const query = `SELECT c.id, c.userId FROM c WHERE c.date < @cutoffDate`;

            const { resources } = await this.container.items
                .query(query, { parameters: [{ name: '@cutoffDate', value: cutoffString }] })
                .fetchAll();

            for (const doc of resources) {
                await this.container.item(doc.id, doc.userId).delete();
            }

            const dedupQuery = `SELECT c.id, c.channelId FROM c WHERE c.date < @cutoffDate`;
            const { resources: dedupResources } = await this.messagesContainer.items
                .query(dedupQuery, { parameters: [{ name: '@cutoffDate', value: cutoffString }] })
                .fetchAll();

            for (const doc of dedupResources) {
                await this.messagesContainer.item(doc.id, doc.channelId).delete();
            }

            console.log(`ActivityService: cleaned up ${resources.length} activity and ${dedupResources.length} dedup records`);
        } catch (error) {
            console.error('ActivityService.cleanupOldData error:', error);
            // Don't throw - cleanup is not critical
        }
    }
}

module.exports = new ActivityService();
