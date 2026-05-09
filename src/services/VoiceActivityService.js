

const { CosmosClient } = require('@azure/cosmos');
const config = require('../config');

const VOICE_ACTIVITY_CONTAINER = 'voice_activity_sessions';
const TTL_35_DAYS = 35 * 24 * 60 * 60; // 3,024,000 seconds

class VoiceActivityService {
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
            id: VOICE_ACTIVITY_CONTAINER,
            partitionKey: { paths: ['/guildId'] },
            defaultTtl: TTL_35_DAYS
        });

        this.container = database.container(VOICE_ACTIVITY_CONTAINER);

        try {
            const { resource: containerDef } = await this.container.read();
            if (containerDef.defaultTtl !== TTL_35_DAYS) {
                await this.container.replace({ ...containerDef, defaultTtl: TTL_35_DAYS });
                console.log('VoiceActivityService: updated TTL on voice_activity_sessions container');
            }
        } catch (e) {
            console.warn('VoiceActivityService: could not patch TTL on voice_activity_sessions container:', e.message);
        }

        this.initialized = true;
    }

    /**
     * Upsert a session document on join (startedAt, no endedAt)
     */
    async upsertSession({ guildId, userId, displayName, avatarURL, startedAt, channelId }) {
        await this.initialize();
        const docId = `${guildId}-${userId}-${startedAt}`;
        await this.container.items.upsert({
            id: docId,
            guildId,
            userId,
            displayName,
            avatarURL,
            startedAt,
            channelId,
            createdAt: Date.now(),
            ttl: TTL_35_DAYS
        });
        return docId;
    }

    /**
     * Update session document on leave/switch (set endedAt, durationSeconds, date)
     */
    async updateSession({ guildId, userId, startedAt, endedAt, displayName, avatarURL }) {
        await this.initialize();
        const docId = `${guildId}-${userId}-${startedAt}`;
        const durationSeconds = Math.round((endedAt - startedAt) / 1000);
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return false;
        const date = new Date(endedAt).toISOString().split('T')[0];

        let doc = null;
        try {
            const readResult = await this.container.item(docId, guildId).read();
            doc = readResult.resource || null;
        } catch (error) {
            if (error?.code !== 404) throw error;
        }

        if (!doc) {
            doc = {
                id: docId,
                guildId,
                userId,
                startedAt,
                createdAt: Date.now(),
                ttl: TTL_35_DAYS
            };
        }

        doc.endedAt = endedAt;
        doc.durationSeconds = durationSeconds;
        doc.date = date;
        doc.displayName = displayName;
        doc.avatarURL = avatarURL;
        await this.container.items.upsert(doc);
        return true;
    }


    async getTopUsersByRecentWindow(windowMs) {
        await this.initialize();

        const cutoffTs = Date.now() - windowMs;
        const query = `
            SELECT c.userId, c.displayName, c.avatarURL, c.endedAt, c.durationSeconds
            FROM c
            WHERE c.endedAt >= @cutoffTs
        `;

        const { resources } = await this.container.items
            .query({ query, parameters: [{ name: '@cutoffTs', value: cutoffTs }] })
            .fetchAll();

        return this._aggregateUsers(resources || []);
    }

    async getTopUsersByPeriod(periodOrDays = 'week') {
        await this.initialize();

        const cutoffString = this._getCutoffDateString(periodOrDays);
        const query = `
            SELECT c.userId, c.displayName, c.avatarURL, c.endedAt, c.durationSeconds
            FROM c
            WHERE c.date >= @cutoffDate
        `;

        const { resources } = await this.container.items
            .query({ query, parameters: [{ name: '@cutoffDate', value: cutoffString }] })
            .fetchAll();

        return this._aggregateUsers(resources || []);
    }

    async getPeriodDebugStats(periodOrDays = 'week') {
        await this.initialize();

        const cutoffDate = this._getCutoffDateString(periodOrDays);
        const query = `
            SELECT c.userId, c.durationSeconds
            FROM c
            WHERE c.date >= @cutoffDate
        `;

        const { resources } = await this.container.items
            .query({ query, parameters: [{ name: '@cutoffDate', value: cutoffDate }] })
            .fetchAll();

        const docs = resources.length;
        const distinctUsers = new Set(resources.map(r => r.userId)).size;
        const totalDurationSeconds = resources.reduce((sum, r) => sum + Number(r.durationSeconds || 0), 0);
        const totalMinutes = Math.round(totalDurationSeconds / 60);

        return {
            cutoffDate,
            docs,
            distinctUsers,
            totalDurationSeconds,
            totalMinutes
        };
    }

    _aggregateUsers(resources) {
        const byUser = new Map();

        for (const record of resources) {
            const userId = record.userId;
            if (!userId) continue;

            const prev = byUser.get(userId);
            if (!prev) {
                byUser.set(userId, {
                    userId,
                    displayName: record.displayName || null,
                    avatarURL: record.avatarURL || null,
                    totalDurationSeconds: Number(record.durationSeconds || 0),
                    lastEndedAt: Number(record.endedAt || 0)
                });
                continue;
            }

            prev.totalDurationSeconds += Number(record.durationSeconds || 0);
            if (Number(record.endedAt || 0) >= prev.lastEndedAt) {
                prev.lastEndedAt = Number(record.endedAt || prev.lastEndedAt);
                prev.displayName = record.displayName || prev.displayName;
                prev.avatarURL = record.avatarURL || prev.avatarURL;
            }
        }

        return Array.from(byUser.values())
            .map(user => ({
                userId: user.userId,
                displayName: user.displayName,
                avatarURL: user.avatarURL,
                totalDurationSeconds: user.totalDurationSeconds,
                totalMinutes: Math.round(user.totalDurationSeconds / 60)
            }))
            .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);
    }

    _getCutoffDateString(periodOrDays) {
        const now = new Date();

        if (typeof periodOrDays === 'number' && Number.isFinite(periodOrDays)) {
            const cutoff = new Date(now);
            cutoff.setDate(cutoff.getDate() - periodOrDays);
            return cutoff.toISOString().split('T')[0];
        }

        const period = String(periodOrDays || 'week');
        const cutoff = new Date(now);

        if (period === 'day') {
            cutoff.setDate(cutoff.getDate() - 1);
        } else if (period === 'week') {
            cutoff.setDate(cutoff.getDate() - 7);
        } else if (period === 'month') {
            cutoff.setMonth(cutoff.getMonth() - 1);
        } else {
            cutoff.setDate(cutoff.getDate() - 7);
        }

        return cutoff.toISOString().split('T')[0];
    }
}

module.exports = new VoiceActivityService();
