const { SlashCommandBuilder } = require('@discordjs/builders');
const { 
    ComponentType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const BirthdayService = require('../services/BirthdayService');
const { isValidDate } = require('../utils/dateUtils');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday-set')
        .setDescription('Set your birthday'),

    async execute(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('birthday_datepicker')
                    .setLabel('Select your birthday')
                    .setStyle(ButtonStyle.Primary)
            );

        const response = await interaction.reply({
            content: 'Click the button below to select your birthday:',
            components: [row],
            flags: ['Ephemeral']
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 60000,
                filter: i => i.user.id === interaction.user.id
            });

            // Create date picker modal
            const modal = new ModalBuilder()
                .setCustomId('birthday_modal')
                .setTitle('Select Your Birthday');

            const dateInput = new TextInputBuilder()
                .setCustomId('birthday_date')
                .setLabel('Your Birthday (DD/MM)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter date (e.g., 25/12)')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(dateInput);
            modal.addComponents(actionRow);

            await buttonInteraction.showModal(modal);

            const modalSubmit = await buttonInteraction.awaitModalSubmit({
                time: 60000,
                filter: i => i.user.id === interaction.user.id
            });

            const dateString = modalSubmit.fields.getTextInputValue('birthday_date');
            const [inputDay, inputMonth] = dateString.split('/').map(num => parseInt(num));

            if (!isValidDate(inputMonth, inputDay)) {
                await modalSubmit.reply({
                    content: 'Invalid date! Please enter a valid date in DD/MM format.',
                    flags: ['Ephemeral']
                });
                return;
            }

            await BirthdayService.setBirthday(interaction.user.id, inputMonth, inputDay);
            
            // Send confirmation to the user
            await modalSubmit.reply({
                content: `Your birthday has been successfully set to ${inputDay}/${inputMonth}! 🎂`,
                flags: ['Ephemeral']
            });

            // Send announcement to birthday channel
            const birthdayChannel = interaction.guild.channels.cache.get(config.birthdayChannel);
            if (birthdayChannel) {
                await birthdayChannel.send(`${interaction.user} has set their birthday! We'll celebrate on ${inputDay}/${inputMonth}! 🎉`);
            }

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await interaction.followUp({
                    content: 'Birthday selection timed out. Please try again.',
                    flags: ['Ephemeral']
                });
            } else {
                console.error('Error in birthday-set command:', error);
                await interaction.followUp({
                    content: 'There was an error setting your birthday!',
                    flags: ['Ephemeral']
                });
            }
        }
    },
};