import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types';

const timeoutCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Exclure temporairement un utilisateur (Mute)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => option.setName('user').setDescription('L\'utilisateur à exclure').setRequired(true))
        .addIntegerOption(option => 
            option.setName('duration')
                .setDescription('Durée de l\'exclusion')
                .setRequired(true)
                .addChoices(
                    { name: '60 Secondes', value: 60 * 1000 },
                    { name: '5 Minutes', value: 5 * 60 * 1000 },
                    { name: '10 Minutes', value: 10 * 60 * 1000 },
                    { name: '1 Heure', value: 60 * 60 * 1000 },
                    { name: '1 Jour', value: 24 * 60 * 60 * 1000 },
                    { name: '1 Semaine', value: 7 * 24 * 60 * 60 * 1000 }
                ))
        .addStringOption(option => option.setName('reason').setDescription('La raison').setRequired(false)),
    async execute(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser('user', true);
        const duration = interaction.options.getInteger('duration', true);
        const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée';
        
        const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'Cet utilisateur n\'est pas sur le serveur.', ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: 'Je ne peux pas mettre cet utilisateur en timeout.', ephemeral: true });
        }

        try {
            await member.timeout(duration, reason);

            const embed = new EmbedBuilder()
                .setColor('DarkOrange')
                .setTitle('Utilisateur Mis en Timeout')
                .setDescription(`${targetUser} a été mis en timeout pour <t:${Math.floor((Date.now() + duration) / 1000)}:R>.`)
                .addFields({ name: 'Raison', value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
            member.send(`Vous avez été mis en timeout sur **${interaction.guild?.name}** pour la raison : ${reason}`).catch(() => null);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Une erreur est survenue lors du timeout.', ephemeral: true });
        }
    },
};

export default timeoutCommand;
