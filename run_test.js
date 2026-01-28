process.env.DISCORD_TOKEN = 'invalid';
process.env.CLIENT_ID = '';
process.env.GUILD_ID = '';
process.env.BIRTHDAY_CHANNEL_ID = '';
process.env.CONGRATS_CHANNEL_ID = '';
process.env.COSMOS_ENDPOINT = '';
process.env.COSMOS_KEY = '';

require('./src/index');

setTimeout(() => {
  console.log('---force-exit---');
  process.exit(0);
}, 5000);
