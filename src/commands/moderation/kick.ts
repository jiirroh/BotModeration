import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types';

const kickCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulser un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option => option.setName('user').setDescription('L\'utilisateur à expulser').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('La raison de l\'expulsion').setRequired(false)),
    async execute(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée';
        
        const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'Cet utilisateur n\'est pas sur le serveur.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'Je ne peux pas expulser cet utilisateur. Mon rôle est-il assez haut ?', ephemeral: true });
        }

        try {
            await member.send(`Vous avez été expulsé de **${interaction.guild?.name}** pour la raison suivante : ${reason}`).catch(() => null);
            await member.kick(reason);

            const embed = new EmbedBuilder()
                .setColor('Orange')
                .setTitle('Utilisateur Expulsé')
                .setDescription(`${targetUser} a été expulsé avec succès.`)
                .addFields({ name: 'Raison', value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'expulsion.', ephemeral: true });
        }
    },
};

export default kickCommand;
