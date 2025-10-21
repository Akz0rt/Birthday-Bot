const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const BirthdayService = require('./BirthdayService');

class NotificationService {
    constructor() {
        this.channel = null;
    }

    setChannel(channel) {
        this.channel = channel;
    }

    async sendBirthdayNotifications() {
        if (!this.channel) return;

        const birthdayUsers = await BirthdayService.getTodaysBirthdays();
        
        if (birthdayUsers.length > 0) {
            for (const userId of birthdayUsers) {
                try {
                    const member = await this.channel.guild.members.fetch(userId);
                    const displayName = member.displayName || member.user.username;
                    
                    const messages = [
                        "🎉 Hip hip hooray! It's your special day!",
                        "🎂 Wishing you the happiest of birthdays!",
                        "🎈 May your day be filled with joy and laughter!",
                        "🎁 Here's to another amazing year ahead!",
                        "✨ It's time to celebrate YOU!"
                    ];
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF69B4')
                        .setTitle(`� Happy Birthday, ${displayName}! �`)
                        .setDescription(messages[Math.floor(Math.random() * messages.length)])
                        .setThumbnail(member.user.displayAvatarURL())
                        .addFields({
                            name: '🌟 Birthday Message',
                            value: 'Wishing you all the best on your special day! May it be filled with wonderful moments and beautiful memories.'
                        });

                    await this.channel.send({
                        content: `@everyone Let's celebrate! It's <@${userId}>'s birthday today! 🎉🎂`,
                        embeds: [embed]
                    });
                } catch (error) {
                    console.error(`Error sending birthday notification for user ${userId}:`, error);
                }
            }
        }
    }
}

module.exports = new NotificationService();