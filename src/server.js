const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const config = require('./config');
const SettingsService = require('./services/SettingsService');
const AzureManagementService = require('./services/AzureManagementService');
const AIService = require('./services/AIService');
const state = require('./state');

// Names of settings that can be edited via the panel (secrets are read-only)
const EDITABLE_SETTINGS = [
    'CHECK_TIME',
    'TIMEZONE',
    'BIRTHDAY_CHANNEL_ID',
    'CONGRATS_CHANNEL_ID',
    'AI_CHANNEL_ID',
    'MALE_ROLE_ID',
    'FEMALE_ROLE_ID',
    'OPENAI_MODEL',
    'AI_MAX_HISTORY'
];

// Settings to display as masked (sensitive credentials)
const SECRET_SETTINGS = [
    'DISCORD_TOKEN',
    'COSMOS_KEY',
    'OPENAI_API_KEY',
    'ADMIN_PASSWORD'
];

// All settings to display in the panel (editable + read-only informational)
const DISPLAY_SETTINGS = [
    ...EDITABLE_SETTINGS,
    'CLIENT_ID',
    'GUILD_ID',
    'COSMOS_ENDPOINT',
    'COSMOS_DB_NAME',
    ...SECRET_SETTINGS
];

function buildSettingsResponse(dbOverrides) {
    const result = {};
    for (const key of DISPLAY_SETTINGS) {
        if (SECRET_SETTINGS.includes(key)) {
            result[key] = { value: '***', editable: false, secret: true };
        } else {
            const envValue = process.env[key] ?? '';
            const dbValue = dbOverrides[key];
            result[key] = {
                value: dbValue !== undefined ? dbValue : envValue,
                editable: EDITABLE_SETTINGS.includes(key),
                secret: false
            };
        }
    }
    return result;
}

// Known app setting keys we manage — used to reconstruct full Azure App Settings on update
const KNOWN_APP_SETTING_KEYS = [
    ...EDITABLE_SETTINGS,
    'DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'COSMOS_ENDPOINT', 'COSMOS_KEY',
    'COSMOS_DB_NAME', 'OPENAI_API_KEY', 'ADMIN_USER', 'ADMIN_PASSWORD',
    'AZURE_SUBSCRIPTION_ID', 'AZURE_RESOURCE_GROUP', 'AZURE_WEBAPP_NAME',
    'BIRTHDAY_CHANNEL_ID', 'CONGRATS_CHANNEL_ID'
];

// Simple in-memory rate limiter for /api/chat
const chatRateLimit = {
    counts: new Map(),
    WINDOW_MS: 60 * 1000,  // 1 minute
    MAX_REQUESTS: 10,
    check(ip) {
        const now = Date.now();
        const entry = this.counts.get(ip);
        if (!entry || now - entry.start > this.WINDOW_MS) {
            this.counts.set(ip, { start: now, count: 1 });
            return true;
        }
        if (entry.count >= this.MAX_REQUESTS) return false;
        entry.count++;
        return true;
    }
};

function createApp() {
    const app = express();

    if (!config.adminPassword) {
        throw new Error('ADMIN_PASSWORD env var is not set. Refusing to start the admin dashboard without a password.');
    }

    // Basic Auth — challenge every request
    app.use(basicAuth({
        users: { [config.adminUser]: config.adminPassword },
        challenge: true,
        realm: 'BirthdayBot Admin'
    }));

    app.use(express.json());

    // Serve the dashboard SPA
    app.use(express.static(path.join(__dirname, 'dashboard')));

    // GET /api/settings — return current settings (env + db overrides)
    app.get('/api/settings', async (req, res) => {
        try {
            const dbOverrides = await SettingsService.getSettings();
            res.json(buildSettingsResponse(dbOverrides));
        } catch (err) {
            console.error('GET /api/settings error:', err);
            res.status(500).json({ error: 'Failed to load settings' });
        }
    });

    // POST /api/settings — save to Cosmos DB + Azure App Settings (if Managed Identity configured)
    app.post('/api/settings', async (req, res) => {
        try {
            const body = req.body || {};
            const patch = {};

            for (const key of EDITABLE_SETTINGS) {
                if (Object.prototype.hasOwnProperty.call(body, key)) {
                    const val = String(body[key]).trim();
                    patch[key] = val;
                }
            }

            if (Object.keys(patch).length === 0) {
                return res.status(400).json({ error: 'No valid settings provided' });
            }

            const azureConfigured = AzureManagementService.isConfigured();

            // Always save to Cosmos DB
            await SettingsService.updateSettings(patch);

            if (azureConfigured) {
                // Sync to Azure App Settings and restart
                try {
                    await AzureManagementService.updateAppSettings(patch, KNOWN_APP_SETTING_KEYS);
                    await AzureManagementService.restart();
                    return res.json({ ok: true, restarting: true });
                } catch (azureErr) {
                    console.error('Azure Management API error:', azureErr);
                    return res.json({
                        ok: true,
                        restarting: false,
                        warn: 'Saved to database, but failed to update Azure App Settings: ' + (azureErr.message || azureErr)
                    });
                }
            }

            // Azure Management not configured — DB-only save
            res.json({ ok: true, restarting: false, warn: 'Saved to database only. Set AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, AZURE_WEBAPP_NAME to enable Azure App Settings sync.' });
        } catch (err) {
            console.error('POST /api/settings error:', err);
            res.status(500).json({ error: 'Failed to save settings' });
        }
    });

    // POST /api/chat — send a message to the AI (web user, shared AI_CHANNEL_ID history)
    app.post('/api/chat', async (req, res) => {
        try {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            if (!chatRateLimit.check(ip)) {
                return res.status(429).json({ error: 'Too many requests. Max 10 messages per minute.' });
            }

            const message = String(req.body?.message || '').trim();
            if (!message) {
                return res.status(400).json({ error: 'message is required' });
            }

            if (!state.guild) {
                return res.status(503).json({ error: 'Bot is not connected to Discord yet. Please wait.' });
            }

            const channelId = config.aiChannelId || 'web-admin';
            const reply = await AIService.processMessage(
                message,
                'web-admin',
                config.adminUser,
                `web-${channelId}`,
                state.guild,
                null
            );

            res.json({ reply });
        } catch (err) {
            console.error('POST /api/chat error:', err);
            res.status(500).json({ error: 'AI processing failed. Check server logs.' });
        }
    });

    // Fallback — serve the SPA for any unknown route (Express 5 compatible)
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
    });

    return app;
}

function startServer() {
    const app = createApp();
    const port = config.port;

    app.listen(port, () => {
        console.log(`🌐 Admin dashboard listening on port ${port}`);
    });

    return app;
}

module.exports = { startServer };
