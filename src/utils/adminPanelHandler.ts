import { ButtonInteraction, AnySelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } from 'discord.js';
import { prisma } from './database';

export async function handleAdminPanel(interaction: ButtonInteraction | AnySelectMenuInteraction) {
    const customId = interaction.customId;

    // --- HELPER : AFFICHER LE MENU PRINCIPAL ---
    const showMainMenu = async (interact: ButtonInteraction | any) => {
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
                new ButtonBuilder().setCustomId('admin_antinuke').setLabel('🛡️ Anti-Nuke').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('admin_filters').setLabel('🤖 Filtres & IA').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('admin_config').setLabel('⚙️ Config').setStyle(ButtonStyle.Secondary)
            );

        if (interact.isRepliable() && !interact.replied && !interact.deferred) {
            await interact.update({ embeds: [embed], components: [row] });
        } else {
            await interact.editReply({ embeds: [embed], components: [row] });
        }
    };

    if (customId === 'admin_back') {
        return showMainMenu(interaction);
    }

    if (customId === 'admin_antinuke' || customId === 'antinuke_toggle') {
        let config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
        if (!config) config = await prisma.guildConfig.create({ data: { guildId: interaction.guildId! } });

        if (customId === 'antinuke_toggle') {
            config = await prisma.guildConfig.update({
                where: { guildId: interaction.guildId! },
                data: { antiNukeEnabled: !config.antiNukeEnabled }
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Configuration Anti-Nuke')
            .setDescription(`Le système Anti-Nuke protège votre serveur contre les administrateurs malveillants ou piratés.\n\n**Statut actuel :** ${config.antiNukeEnabled ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}\n\n**Règles appliquées si activé :**\n- Bannissements de masse (>${config.antiNukeBanThreshold} en 10s) : **BLOQUÉ**\n- Suppression de salons (>${config.antiNukeChannelThreshold} en 10s) : **BLOQUÉ**\n\n*Sanction : ${config.antiNukeAction === 'BAN' ? 'Bannissement définitif' : config.antiNukeAction === 'KICK' ? 'Expulsion' : 'Retrait de tous les rôles'} du modérateur attaquant.*`)
            .setColor(config.antiNukeEnabled ? 'Green' : 'Red');
        
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('antinuke_toggle')
                    .setLabel(config.antiNukeEnabled ? 'Désactiver' : 'Activer')
                    .setStyle(config.antiNukeEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('antinuke_config')
                    .setLabel('⚙️ Configurer')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('admin_back')
                    .setLabel('⬅️ Retour')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [row] });
        return;
    }

    if (customId === 'antinuke_config') {
        const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
        
        const modal = new ModalBuilder()
            .setCustomId('modal_antinuke_config')
            .setTitle('Paramètres Anti-Nuke');

        const banThresholdInput = new TextInputBuilder()
            .setCustomId('banThresholdInput')
            .setLabel('Bans en 10s avant déclenchement')
            .setPlaceholder('Ex: 3')
            .setValue(config?.antiNukeBanThreshold?.toString() || '3')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        const channelThresholdInput = new TextInputBuilder()
            .setCustomId('channelThresholdInput')
            .setLabel('Salons supprimés en 10s')
            .setPlaceholder('Ex: 3')
            .setValue(config?.antiNukeChannelThreshold?.toString() || '3')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionInput = new TextInputBuilder()
            .setCustomId('actionInput')
            .setLabel('Sanction (ROLES, KICK, ou BAN)')
            .setPlaceholder('Ex: ROLES')
            .setValue(config?.antiNukeAction === 'REMOVE_ROLES' ? 'ROLES' : (config?.antiNukeAction || 'ROLES'))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(banThresholdInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(channelThresholdInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(actionInput)
        );

        await interaction.showModal(modal);
        return;
    }

    if (customId === 'admin_filters') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Filtres & IA')
            .setDescription('Gérez votre liste de mots strictement interdits (Censure immédiate).')
            .setColor('Blue');
        
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('filter_add_word').setLabel('➕ Ajouter un mot').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('filter_list_words').setLabel('📜 Voir la liste').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('admin_back').setLabel('⬅️ Retour').setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [row] });
        return;
    }

    if (customId === 'admin_config') {
        const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuration Initiale')
            .setDescription("Sélectionnez les salons et rôles ci-dessous pour configurer le bot. Les changements sont enregistrés automatiquement.")
            .addFields(
                { name: 'Log Channel', value: config?.logChannelId ? `<#${config.logChannelId}>` : 'Non défini', inline: true },
                { name: 'Honeypot Channel', value: config?.honeypotChannelId ? `<#${config.honeypotChannelId}>` : 'Non défini', inline: true },
                { name: 'Quarantine Role', value: config?.quarantineRoleId ? `<@&${config.quarantineRoleId}>` : 'Non défini', inline: true },
                { name: 'Staff Role', value: config?.staffRoleId ? `<@&${config.staffRoleId}>` : 'Non défini', inline: true }
            )
            .setColor('Grey');
        
        const logMenu = new ChannelSelectMenuBuilder()
            .setCustomId('config_log_channel')
            .setPlaceholder('Choisir le salon des Logs')
            .setChannelTypes(ChannelType.GuildText);

        const honeypotMenu = new ChannelSelectMenuBuilder()
            .setCustomId('config_honeypot_channel')
            .setPlaceholder('Choisir le salon Honeypot (Piège)')
            .setChannelTypes(ChannelType.GuildText);

        const quarantineMenu = new RoleSelectMenuBuilder()
            .setCustomId('config_quarantine_role')
            .setPlaceholder('Choisir le rôle Quarantaine');

        const staffMenu = new RoleSelectMenuBuilder()
            .setCustomId('config_staff_role')
            .setPlaceholder('Choisir le rôle Staff (Alertes)');

        const btnRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(new ButtonBuilder().setCustomId('admin_back').setLabel('⬅️ Retour au Menu Principal').setStyle(ButtonStyle.Secondary));
        
        await interaction.update({ 
            embeds: [embed], 
            components: [
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(logMenu),
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(honeypotMenu),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(quarantineMenu),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(staffMenu),
                btnRow
            ] 
        });
        return;
    }

    if (customId.startsWith('config_') && interaction.isAnySelectMenu()) {
        const selectedId = interaction.values[0];
        const dataToUpdate: any = {};

        if (customId === 'config_log_channel') dataToUpdate.logChannelId = selectedId;
        if (customId === 'config_honeypot_channel') dataToUpdate.honeypotChannelId = selectedId;
        if (customId === 'config_quarantine_role') dataToUpdate.quarantineRoleId = selectedId;
        if (customId === 'config_staff_role') dataToUpdate.staffRoleId = selectedId;

        await prisma.guildConfig.update({
            where: { guildId: interaction.guildId! },
            data: dataToUpdate
        });

        // Re-render the admin_config panel
        interaction.customId = 'admin_config';
        return handleAdminPanel(interaction);
    }

    if (customId === 'filter_add_word') {
        const modal = new ModalBuilder()
            .setCustomId('modal_add_word')
            .setTitle('Ajouter un mot banni');

        const wordInput = new TextInputBuilder()
            .setCustomId('wordInput')
            .setLabel('Quel mot voulez-vous interdire ?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(wordInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
        return;
    }

    if (customId === 'filter_list_words') {
        const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
        let bannedWords: string[] = [];
        try { bannedWords = JSON.parse(config?.bannedWords || '[]'); } catch (e) {}

        const embed = new EmbedBuilder()
            .setTitle('📜 Liste Noire')
            .setDescription(bannedWords.length > 0 ? bannedWords.map(w => `- \`${w}\``).join('\n') : '*Aucun mot banni.*')
            .setColor('DarkButNotBlack');
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
}
