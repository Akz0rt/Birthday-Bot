const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BirthdayService = require('../services/BirthdayService');
const { formatDate, getDaysUntilBirthday } = require('../utils/dateUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthdays')
        .setDescription('List all registered birthdays'),

    async execute(interaction) {
        try {
            const birthdays = await BirthdayService.getAllBirthdays();
            const birthdayList = Object.entries(birthdays);

            if (birthdayList.length === 0) {
                return await interaction.reply('No birthdays have been registered yet!');
            }

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Registered Birthdays')
                .setDescription('Here are all the registered birthdays:');

            for (const [userId, data] of birthdayList) {
                const date = new Date(2000, data.month - 1, data.day);
                const formattedDate = formatDate(date);
                const daysUntil = getDaysUntilBirthday(data.month, data.day);
                
                embed.addFields({
                    name: `<@${userId}>`,
                    value: `${formattedDate} (${daysUntil} days until birthday)`
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply('There was an error fetching the birthdays!');
        }
    },
};