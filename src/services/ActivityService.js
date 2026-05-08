const { CosmosClient } = require('@azure/cosmos');
const config = require('../config');

const ACTIVITY_CONTAINER = 'activity';

class ActivityService {
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

        // Create activity container if it doesn't exist
        await database.containers.createIfNotExists({
            id: ACTIVITY_CONTAINER,
            partitionKey: { paths: ['/userId'] }
        });

        this.container = database.container(ACTIVITY_CONTAINER);
        this.initialized = true;
    }

    /**
     * Record a user message
     * @param {string} userId - Discord user ID
     * @param {string} displayName - User display name
     * @param {string} avatarURL - User avatar URL
     */
    async recordMessage(userId, displayName, avatarURL) {
        await this.initialize();

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const docId = `${userId}-${today}`;

        try {
            const { resource } = await this.container
                .item(docId, userId)
                .read();

            // Update existing record
            resource.messageCount = (resource.messageCount || 0) + 1;
            resource.lastMessageTime = Date.now();
            resource.displayName = displayName;
            resource.avatarURL = avatarURL;
            delete resource._rid;
            delete resource._self;
            delete resource._etag;
            delete resource._attachments;
            delete resource._ts;
            await this.container.items.upsert(resource);
        } catch (error) {
            if (error.code === 404) {
                // Create new record
                const newRecord = {
                    id: docId,
                    userId,
                    date: today,
                    displayName,
                    avatarURL,
                    messageCount: 1,
                    lastMessageTime: Date.now()
                };
                await this.container.items.create(newRecord);
            } else {
                console.error('ActivityService.recordMessage error:', error);
                throw error;
            }
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

            console.log(`ActivityService: cleaned up ${resources.length} old activity records`);
        } catch (error) {
            console.error('ActivityService.cleanupOldData error:', error);
            // Don't throw - cleanup is not critical
        }
    }
}

module.exports = new ActivityService();
