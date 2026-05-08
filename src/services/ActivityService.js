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
                SELECT c.userId, c.displayName, c.avatarURL, c.messageCount, c.lastMessageTime
                FROM c
                WHERE c.date >= @cutoffDate
            `;

            const { resources } = await this.container.items
                .query(query, { parameters: [{ name: '@cutoffDate', value: cutoffString }] })
                .fetchAll();

            const aggregated = this._aggregateTopUsers(resources);
            if (aggregated.length > 0) return aggregated;

            return this._getTopUsersFromDedup(cutoffString);
        } catch (error) {
            console.error('ActivityService.getTopUsersByPeriod error:', error?.message || error);
            throw error;
        }
    }

    /**
     * Get top users for an exact recent time window using per-message dedup docs.
     * @param {number} windowMs
     * @returns {Promise<Array<{userId:string, displayName:null, avatarURL:null, totalMessages:number}>>}
     */
    async getTopUsersByRecentWindow(windowMs) {
        await this.initialize();

        const cutoffTs = Date.now() - windowMs;
        const query = `
            SELECT c.userId
            FROM c
            WHERE c.createdAt >= @cutoffTs
        `;

        const { resources } = await this.messagesContainer.items
            .query(query, { parameters: [{ name: '@cutoffTs', value: cutoffTs }] })
            .fetchAll();

        if (!resources || resources.length === 0) {
            return [];
        }

        const byUser = new Map();
        for (const row of resources) {
            byUser.set(row.userId, (byUser.get(row.userId) || 0) + 1);
        }

        return Array.from(byUser.entries())
            .map(([userId, totalMessages]) => ({
                userId,
                displayName: null,
                avatarURL: null,
                totalMessages
            }))
            .sort((a, b) => b.totalMessages - a.totalMessages);
    }

    _aggregateTopUsers(resources) {
        const byUser = new Map();
        for (const row of resources || []) {
            const prev = byUser.get(row.userId);
            if (!prev) {
                byUser.set(row.userId, {
                    userId: row.userId,
                    displayName: row.displayName,
                    avatarURL: row.avatarURL,
                    totalMessages: row.messageCount || 0,
                    lastMessageTime: row.lastMessageTime || 0
                });
                continue;
            }

            prev.totalMessages += row.messageCount || 0;
            if ((row.lastMessageTime || 0) >= (prev.lastMessageTime || 0)) {
                prev.lastMessageTime = row.lastMessageTime || prev.lastMessageTime;
                prev.displayName = row.displayName || prev.displayName;
                prev.avatarURL = row.avatarURL || prev.avatarURL;
            }
        }

        return Array.from(byUser.values()).sort((a, b) => b.totalMessages - a.totalMessages);
    }

    async _getTopUsersFromDedup(cutoffString) {
        const dedupQuery = `
            SELECT c.userId
            FROM c
            WHERE c.date >= @cutoffDate
        `;

        const { resources } = await this.messagesContainer.items
            .query(dedupQuery, { parameters: [{ name: '@cutoffDate', value: cutoffString }] })
            .fetchAll();

        if (!resources || resources.length === 0) {
            return [];
        }

        const byUser = new Map();
        for (const row of resources) {
            byUser.set(row.userId, (byUser.get(row.userId) || 0) + 1);
        }

        return Array.from(byUser.entries())
            .map(([userId, totalMessages]) => ({
                userId,
                displayName: null,
                avatarURL: null,
                totalMessages
            }))
            .sort((a, b) => b.totalMessages - a.totalMessages);
    }

    async getPeriodDebugStats(days = 7) {
        await this.initialize();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        const activityQuery = `
            SELECT c.userId, c.messageCount
            FROM c
            WHERE c.date >= @cutoffDate
        `;

        const dedupQuery = `
            SELECT c.userId
            FROM c
            WHERE c.date >= @cutoffDate
        `;

        const [{ resources: activityRows }, { resources: dedupRows }] = await Promise.all([
            this.container.items.query(activityQuery, { parameters: [{ name: '@cutoffDate', value: cutoffString }] }).fetchAll(),
            this.messagesContainer.items.query(dedupQuery, { parameters: [{ name: '@cutoffDate', value: cutoffString }] }).fetchAll()
        ]);

        const activityUsers = new Set();
        let totalActivityMessages = 0;
        for (const row of activityRows) {
            if (row.userId) activityUsers.add(row.userId);
            totalActivityMessages += Number(row.messageCount || 0);
        }

        const dedupUsers = new Set();
        for (const row of dedupRows) {
            if (row.userId) dedupUsers.add(row.userId);
        }

        return {
            days,
            cutoffDate: cutoffString,
            activityDocs: activityRows.length,
            dedupDocs: dedupRows.length,
            distinctUsersFromActivity: activityUsers.size,
            distinctUsersFromDedup: dedupUsers.size,
            totalActivityMessages
        };
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
