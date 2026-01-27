const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CosmosDBService = require('../services/CosmosDBService');
const { formatDate, getDaysUntilBirthday } = require('../utils/dateUtils');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription("Check a user's birthday")
        .addUserOption(option => 
            option
                .setName('user')
                .setDescription('The user to check birthday for')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const birthday = await CosmosDBService.getBirthday(targetUser.id);

            if (!birthday) {
                return await interaction.reply({
                    content: `${targetUser.username} has not set their birthday yet.`,
                    ephemeral: true
                });
            }

            const date = new Date(2000, birthday.month - 1, birthday.day);
            const formattedDate = formatDate(date);
            const daysUntil = getDaysUntilBirthday(birthday.month, birthday.day);
            const member = await interaction.guild.members.fetch(targetUser.id);
            const displayName = member.displayName || targetUser.username;
            
            // Determine pronoun based on roles
            let pronoun = "their"; // default pronoun
            if (member.roles.cache.has(config.maleRoleId)) {
                pronoun = "his";
            } else if (member.roles.cache.has(config.femaleRoleId)) {
                pronoun = "her";
            }

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle(` ${displayName}'s Birthday`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields({ 
                    name: 'Birthday', 
                    value: formattedDate, 
                    inline: true 
                });

            if (daysUntil === 0) {
                embed.addFields({
                    name: 'Status',
                    value: ` Today is ${pronoun} birthday!`,
                    inline: true
                });
            } else if (daysUntil === 1) {
                embed.addFields({
                    name: 'Coming Up',
                    value: ` ${displayName}'s birthday is tomorrow!`,
                    inline: true
                });
            } else {
                embed.addFields({
                    name: 'Days Until',
                    value: ` ${daysUntil} days until ${pronoun} birthday`,
                    inline: true
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in birthday command:', error);
            await interaction.reply({
                content: 'There was an error fetching the birthday information!',
                ephemeral: true
            });
        }
    },
};
