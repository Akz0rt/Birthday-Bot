const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BirthdayService = require('../services/BirthdayService');
const { formatDate, getDaysUntilBirthday } = require('../utils/dateUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthdays')
        .setDescription('List birthdays coming up in the next 7 days'),

    async execute(interaction) {
        try {
            const birthdays = await BirthdayService.getAllBirthdays();
            const birthdayList = Object.entries(birthdays);
            
            // Filter birthdays within next 7 days
            const upcomingBirthdays = birthdayList
                .map(([userId, data]) => ({
                    userId,
                    ...data,
                    daysUntil: getDaysUntilBirthday(data.month, data.day)
                }))
                .filter(birthday => birthday.daysUntil <= 7)
                .sort((a, b) => a.daysUntil - b.daysUntil);

            if (upcomingBirthdays.length === 0) {
                return await interaction.reply('No birthdays coming up in the next 7 days! 🎂');
            }

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Upcoming Birthdays')
                .setDescription('Birthdays in the next 7 days:');

            for (const birthday of upcomingBirthdays) {
                const date = new Date(2000, birthday.month - 1, birthday.day);
                const formattedDate = formatDate(date);
                const member = await interaction.guild.members.fetch(birthday.userId);
                const displayName = member.displayName || member.user.username;
                
                let description = `${formattedDate}`;
                if (birthday.daysUntil === 0) {
                    description += ' (Today! 🎉)';
                } else if (birthday.daysUntil === 1) {
                    description += ' (Tomorrow! 🎈)';
                } else {
                    description += ` (in ${birthday.daysUntil} days)`;
                }

                embed.addFields({
                    name: `${displayName}`,
                    value: `<@${birthday.userId}> - ${description}`
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in birthdays command:', error);
            await interaction.reply('There was an error fetching the birthdays!');
        }
    },
};