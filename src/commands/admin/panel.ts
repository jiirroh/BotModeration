import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../types';

const panelCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription("🎛️ Ouvre le panneau d'administration interactif du bot.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ Panneau d'Administration Central")
            .setDescription("Bienvenue dans l'interface de gestion de votre bot. Cliquez sur une catégorie ci-dessous pour configurer votre serveur sans avoir à taper de commandes complexes.")
            .setColor('#5865F2')
            .addFields(
                { name: '🔥 Anti-Nuke & Anti-Raid', value: 'Gérez la protection contre le piratage du staff et les attaques massives.' },
                { name: '🤖 IA & Filtres', value: 'Configurez la sensibilité de Mistral et vos mots bannis.' },
                { name: '⚙️ Configuration Base', value: 'Définissez vos salons de logs, rôle quarantaine, etc.' }
            )
            .setFooter({ text: 'Interface sécurisée - Réservée aux administrateurs' });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('admin_antinuke')
                    .setLabel('🛡️ Anti-Nuke')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('admin_filters')
                    .setLabel('🤖 Filtres & IA')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('admin_config')
                    .setLabel('⚙️ Config')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};

export default panelCommand;
