import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';
import { prisma } from '../../utils/database';

const searchCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('🔍 Rechercher dans les logs du serveur (Admin).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Rechercher les actions liées à cet utilisateur')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Rechercher un mot-clé dans les détails')
                .setRequired(false)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('utilisateur');
        const text = interaction.options.getString('texte');

        if (!user && !text) {
            return interaction.editReply({ content: '❌ Veuillez fournir au moins un utilisateur ou un texte à rechercher.' });
        }

        // Construire la requête de recherche pour les logs
        const logWhereClause: any = { guildId: interaction.guildId };
        if (user) {
            logWhereClause.OR = [
                { targetId: user.id },
                { moderatorId: user.id }
            ];
        }
        if (text) {
            if (logWhereClause.OR) {
                // Si on a déjà un OR, on ajoute une condition AND
                logWhereClause.AND = [
                    {
                        OR: [
                            { details: { contains: text } },
                            { actionType: { contains: text } }
                        ]
                    }
                ];
            } else {
                logWhereClause.OR = [
                    { details: { contains: text } },
                    { actionType: { contains: text } }
                ];
            }
        }

        const logs = await prisma.log.findMany({
            where: logWhereClause,
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const warnWhereClause: any = { guildId: interaction.guildId };
        if (user) {
            warnWhereClause.userId = user.id;
        }
        if (text) {
            warnWhereClause.reason = { contains: text };
        }

        const warns = await prisma.warn.findMany({
            where: warnWhereClause,
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const embed = new EmbedBuilder()
            .setTitle(`Résultats de recherche`)
            .setColor('#2b2d31')
            .setTimestamp();
        
        let desc = `Recherche pour ${user ? `<@${user.id}>` : ''} ${text ? `"${text}"` : ''}\n\n`;

        if (warns.length > 0) {
            desc += `**Avertissements (Warns) :**\n`;
            warns.forEach(w => {
                desc += `- [${w.createdAt.toLocaleDateString()}] <@${w.userId}> par <@${w.moderatorId}> : ${w.reason}\n`;
            });
            desc += `\n`;
        }

        if (logs.length > 0) {
            desc += `**Derniers Logs :**\n`;
            logs.forEach(l => {
                let dText = '';
                try {
                    const d = JSON.parse(l.details);
                    dText = d.reason || d.message || l.details;
                } catch {
                    dText = l.details;
                }
                desc += `- [${l.createdAt.toLocaleDateString()}] **${l.actionType}** | Cible: ${l.targetId ? `<@${l.targetId}>` : 'N/A'} | ${dText}\n`;
            });
        } else if (warns.length === 0) {
            desc += `*Aucun résultat trouvé.*`;
        }

        embed.setDescription(desc.substring(0, 4000)); // Discord limit
        
        await interaction.editReply({ embeds: [embed] });
    },
};

export default searchCommand;
