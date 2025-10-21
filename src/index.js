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
    const channel = client.channels.cache.get(config.birthdayChannel);
    if (channel) {
        NotificationService.setChannel(channel);
        console.log('Birthday channel configured successfully');
        
        // Start the birthday scheduler (includes initial check)
        SchedulerService.start();
    } else {
        console.error('Birthday channel not found! Please check BIRTHDAY_CHANNEL_ID in .env');
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

// Log in to Discord
client.login(config.token);