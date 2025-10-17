# Discord Birthday Bot

A Discord bot that helps manage and celebrate server members' birthdays.

## Features

- Set your birthday using `/birthday` command
- View all registered birthdays using `/birthdays` command
- Automatic birthday announcements in a designated channel
- Daily birthday checks at configurable times
- Timezone support

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open `.env` and fill in your configuration:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `CLIENT_ID`: Your Discord application client ID
   - `GUILD_ID`: Your Discord server ID
   - `BIRTHDAY_CHANNEL_ID`: The channel ID where birthday announcements will be sent
   - `TIMEZONE`: Your preferred timezone (default: UTC)
   - `CHECK_TIME`: Time to check for birthdays (format: HH:MM, default: 00:00)

## Running the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Commands

- `/birthday <month> <day>` - Set your birthday
- `/birthdays` - View all registered birthdays

## Data Storage

Birthdays are stored in `birthdays.json` in the following format:
```json
{
  "userId": {
    "month": 1,
    "day": 1
  }
}
```
