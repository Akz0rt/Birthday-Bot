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
        
        for (const userId of birthdayUsers) {
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎉 Happy Birthday! 🎂')
                .setDescription(`Happy Birthday <@${userId}>! 🎈\nHave a wonderful day! 🎁`);

            await this.channel.send({ 
                content: `<@${userId}>`,
                embeds: [embed]
            });
        }
    }
}

module.exports = new NotificationService();