require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    timezone: process.env.TIMEZONE || 'UTC',
    birthdayChannel: process.env.BIRTHDAY_CHANNEL_ID,
    checkTime: process.env.CHECK_TIME || '00:00',
    maleRoleId: process.env.MALE_ROLE_ID,
    femaleRoleId: process.env.FEMALE_ROLE_ID,
    // Channel where congratulations (birthday announcements) are posted
    congratsChannel: process.env.CONGRATS_CHANNEL_ID,
    
    // Azure CosmosDB Configuration
    cosmosEndpoint: process.env.COSMOS_ENDPOINT,
    cosmosKey: process.env.COSMOS_KEY,
    cosmosDbName: process.env.COSMOS_DB_NAME || 'BirthdayBotDB',

    // OpenAI (AI assistant)
    openaiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    aiChannelId: process.env.AI_CHANNEL_ID,
    aiMaxHistory: parseInt(process.env.AI_MAX_HISTORY || '20', 10)
};