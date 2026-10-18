import { Events, Interaction } from 'discord.js';

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction) {
        // --- GESTION DES BOUTONS DE QUARANTAINE ---
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            if (customId.startsWith('quarantine_')) {
                // Vérification des permissions (seuls les modérateurs/admins peuvent cliquer)
                const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.reply({ content: "❌ Vous n'avez pas la permission de gérer la quarantaine.", ephemeral: true });
                }

                const action = customId.split('_')[1]; // 'approve' ou 'reject'
                const targetId = customId.split('_')[2];
                const guildId = interaction.guildId!;

                if (!targetId || !guildId) return;

                // On récupère le membre
                const member = await interaction.guild?.members.fetch(targetId).catch(() => null);
                
                const { prisma } = require('../utils/database');
                const config = await prisma.guildConfig.findUnique({ where: { guildId } });

                if (action === 'approve') {
                    if (member && config?.quarantineRoleId) {
                        await member.roles.remove(config.quarantineRoleId).catch(console.error);
                    }
                    
                    await prisma.quarantine.updateMany({
                        where: { userId: targetId, guildId: guildId, status: 'PENDING' },
                        data: { status: 'APPROVED' }
                    });

                    // Mise à jour du message
                    const oldEmbed = interaction.message.embeds[0];
                    const newEmbed = EmbedBuilder.from(oldEmbed)
                        .setColor('Green')
                        .setTitle('✅ Quarantaine Levée')
                        .spliceFields(-1, 1, { name: 'Action', value: `Approuvé par ${interaction.user}` });

                    await interaction.update({ embeds: [newEmbed], components: [] });

                } else if (action === 'reject') {
                    if (member && member.kickable) {
                        await member.send(`Vous avez été refusé sur le serveur **${interaction.guild?.name}**.`).catch(() => null);
                        await member.kick('Refusé lors de la quarantaine');
                    }

                    await prisma.quarantine.updateMany({
                        where: { userId: targetId, guildId: guildId, status: 'PENDING' },
                        data: { status: 'REJECTED' }
                    });

                    // Mise à jour du message
                    const oldEmbed = interaction.message.embeds[0];
                    const newEmbed = EmbedBuilder.from(oldEmbed)
                        .setColor('Red')
                        .setTitle('🔨 Accès Refusé (Kick)')
                        .spliceFields(-1, 1, { name: 'Action', value: `Rejeté par ${interaction.user}` });

                    await interaction.update({ embeds: [newEmbed], components: [] });
                }
                return;
            }
        }
        // -------------------------------------------
        // --- GESTION DU PANNEAU D'ADMINISTRATION ---
        if ((interaction.isButton() || interaction.isAnySelectMenu()) && (interaction.customId.startsWith('admin_') || interaction.customId.startsWith('filter_') || interaction.customId.startsWith('antinuke_') || interaction.customId.startsWith('config_'))) {
            const { handleAdminPanel } = require('../utils/adminPanelHandler');
            return handleAdminPanel(interaction as any);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_add_word') {
            const word = interaction.fields.getTextInputValue('wordInput').toLowerCase();
            const { prisma } = require('../utils/database');
            
            let config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
            if (!config) {
                config = await prisma.guildConfig.create({ data: { guildId: interaction.guildId!, bannedWords: '[]' } });
            }
            let bannedWords: string[] = [];
            try { bannedWords = JSON.parse(config.bannedWords); } catch (e) {}

            if (!bannedWords.includes(word)) {
                bannedWords.push(word);
                await prisma.guildConfig.update({
                    where: { guildId: interaction.guildId! },
                    data: { bannedWords: JSON.stringify(bannedWords) }
                });
                await interaction.reply({ content: `✅ Le mot **${word}** a été ajouté à la liste noire avec succès !`, ephemeral: true });
            } else {
                await interaction.reply({ content: `⚠️ Le mot **${word}** est déjà banni.`, ephemeral: true });
            }
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_antinuke_config') {
            const banThresholdStr = interaction.fields.getTextInputValue('banThresholdInput');
            const channelThresholdStr = interaction.fields.getTextInputValue('channelThresholdInput');
            const actionStr = interaction.fields.getTextInputValue('actionInput').toUpperCase();
            
            const banThreshold = parseInt(banThresholdStr);
            const channelThreshold = parseInt(channelThresholdStr);
            if (isNaN(banThreshold) || banThreshold < 1 || isNaN(channelThreshold) || channelThreshold < 1) {
                return interaction.reply({ content: '❌ Les seuils doivent être des nombres valides supérieurs à 0.', ephemeral: true });
            }

            if (!['ROLES', 'KICK', 'BAN', 'REMOVE_ROLES'].includes(actionStr)) {
                return interaction.reply({ content: '❌ La sanction doit être "ROLES", "KICK" ou "BAN".', ephemeral: true });
            }

            const finalAction = actionStr === 'ROLES' ? 'REMOVE_ROLES' : actionStr;

            const { prisma } = require('../utils/database');
            await prisma.guildConfig.update({
                where: { guildId: interaction.guildId! },
                data: { antiNukeBanThreshold: banThreshold, antiNukeChannelThreshold: channelThreshold, antiNukeAction: finalAction }
            });

            await interaction.reply({ content: `✅ Configuration Anti-Nuke mise à jour !\n- Bannissements: **>${banThreshold} en 10s**\n- Salons supprimés: **>${channelThreshold} en 10s**\n- Sanction: **${finalAction}**`, ephemeral: true });
            return;
        }
        // -------------------------------------------

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};
