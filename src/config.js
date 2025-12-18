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
    congratsChannel: process.env.CONGRATS_CHANNEL_ID
};