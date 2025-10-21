const { SlashCommandBuilder } = require('discord.js');
const BirthdayService = require('../services/BirthdayService');
const { isValidDate } = require('../utils/dateUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday-set')
        .setDescription('Set your birthday using a date picker')
        .addIntegerOption(option =>
            option.setName('month')
                .setDescription('Birth month (1-12)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(12))
        .addIntegerOption(option =>
            option.setName('day')
                .setDescription('Birth day (1-31)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(31)),

    async execute(interaction) {
        const month = interaction.options.getInteger('month');
        const day = interaction.options.getInteger('day');

        try {
            if (!isValidDate(month, day)) {
                return await interaction.reply({ 
                    content: 'Please provide a valid date!', 
                    ephemeral: true 
                });
            }

            await BirthdayService.setBirthday(interaction.user.id, month, day);
            await interaction.reply({ 
                content: `Your birthday has been set to ${month}/${day}!`,
                ephemeral: true 
            });
        } catch (error) {
            await interaction.reply({ 
                content: 'There was an error setting your birthday!',
                ephemeral: true 
            });
        }
    },
};