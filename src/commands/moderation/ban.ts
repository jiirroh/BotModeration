import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types';

const banCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option => option.setName('user').setDescription('L\'utilisateur à bannir').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('La raison du bannissement').setRequired(false))
        .addIntegerOption(option => 
            option.setName('delete_messages')
                .setDescription('Supprimer les messages récents (en jours)')
                .setRequired(false)
                .addChoices(
                    { name: 'Ne rien supprimer', value: 0 },
                    { name: '1 Jour', value: 1 },
                    { name: '7 Jours', value: 7 }
                )),
    async execute(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée';
        const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;
        
        const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

        if (member && !member.bannable) {
            return interaction.reply({ content: 'Je ne peux pas bannir cet utilisateur. Mon rôle est-il assez haut ?', ephemeral: true });
        }

        try {
            if (member) {
                await member.send(`Vous avez été banni de **${interaction.guild?.name}** pour la raison suivante : ${reason}`).catch(() => null);
            }
            
            await interaction.guild?.members.ban(targetUser.id, { reason, deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60 });

            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('Utilisateur Banni')
                .setDescription(`${targetUser} a été banni avec succès.`)
                .addFields({ name: 'Raison', value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Une erreur est survenue lors du bannissement.', ephemeral: true });
        }
    },
};

export default banCommand;
