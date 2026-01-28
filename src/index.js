const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const SchedulerService = require('./services/SchedulerService');
const NotificationService = require('./services/NotificationService');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Create a collection for commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, async () => {
    console.log('Discord bot is ready! 🎉');
    
    // Set up birthday channel for notifications
    const announceChannel = client.channels.cache.get(config.birthdayChannel);
    const congratsChannel = client.channels.cache.get(config.congratsChannel);

    if (announceChannel || congratsChannel) {
        NotificationService.setChannels(announceChannel, congratsChannel);
        console.log('Notification channels configured successfully');

        // Start the birthday scheduler (includes initial check)
        SchedulerService.start();
    } else {
        console.error('No notification channels found! Please check BIRTHDAY_CHANNEL_ID and CONGRATS_CHANNEL_ID in .env');
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                content: 'There was an error executing this command!',
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: 'There was an error executing this command!',
                ephemeral: true 
            });
        }
    }
});

// Minimal HTTP server for health checks (helps Azure detect running app)
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Birthday Bot is running');
});

server.listen(PORT, () => {
    console.log(`Health server listening on port ${PORT}`);
});

// Global process error handlers to keep the container alive long enough for diagnostics
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', err => {
    console.error('Uncaught Exception thrown:', err);
});

// Discord client error handlers
client.on('error', error => {
    console.error('Discord client error:', error);
});

client.on('warn', info => {
    console.warn('Discord client warning:', info);
});

client.once('shardError', error => {
    console.error('A websocket connection encountered an error:', error);
});

// Log in to Discord (catch failures so the process doesn't crash silently)
client.login(config.token).catch(err => {
    console.error('Failed to login to Discord:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received: shutting down');
    try { await client.destroy(); } catch (e) { console.error(e); }
    server.close(() => process.exit(0));

    // Force exit if shutdown hangs
    setTimeout(() => process.exit(1), 5000).unref();
});