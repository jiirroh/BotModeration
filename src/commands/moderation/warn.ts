import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types';
import { prisma } from '../../utils/database';

const warnCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Système d\'avertissement')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Avertir un utilisateur')
                .addUserOption(option => option.setName('user').setDescription('L\'utilisateur à avertir').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('La raison de l\'avertissement').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lister les avertissements d\'un utilisateur')
                .addUserOption(option => option.setName('user').setDescription('L\'utilisateur').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retirer un avertissement')
                .addIntegerOption(option => option.setName('id').setDescription('L\'ID de l\'avertissement').setRequired(true))),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user', true);
            const reason = interaction.options.getString('reason', true);

            const warn = await prisma.warn.create({
                data: {
                    userId: targetUser.id,
                    guildId,
                    reason,
                    moderatorId: interaction.user.id
                }
            });

            const embed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('Avertissement Ajouté')
                .setDescription(`L'utilisateur ${targetUser} a été averti.\n**Raison:** ${reason}`)
                .setFooter({ text: `Warn ID: ${warn.id}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'list') {
            const targetUser = interaction.options.getUser('user', true);

            const warns = await prisma.warn.findMany({
                where: { userId: targetUser.id, guildId },
                orderBy: { createdAt: 'desc' }
            });

            if (warns.length === 0) {
                return interaction.reply({ content: `${targetUser} n'a aucun avertissement.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle(`Avertissements de ${targetUser.tag}`)
                .setDescription(warns.map(w => `**ID ${w.id}** - <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>\nPar: <@${w.moderatorId}>\nRaison: ${w.reason}`).join('\n\n'))
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            const warnId = interaction.options.getInteger('id', true);

            const warn = await prisma.warn.findUnique({ where: { id: warnId } });

            if (!warn || warn.guildId !== guildId) {
                return interaction.reply({ content: 'Avertissement introuvable.', ephemeral: true });
            }

            await prisma.warn.delete({ where: { id: warnId } });

            await interaction.reply({ content: `L'avertissement **${warnId}** a été supprimé avec succès.`, ephemeral: true });
        }
    },
};

export default warnCommand;
