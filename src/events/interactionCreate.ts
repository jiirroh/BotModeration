import { Events, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

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

            // --- GESTION DU /SAY AVEC CORRECTION IA ET CONFIRMATION ---
            if (customId.startsWith('say_')) {
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "❌ Seuls les Administrateurs peuvent utiliser cette action.", ephemeral: true });
                }

                const { pendingSayMessages } = require('../commands/admin/say');
                const pending = pendingSayMessages.get(interaction.user.id);

                if (!pending) {
                    return interaction.update({
                        content: "⚠️ Aucun message en attente trouvé ou le délai a expiré. Veuillez retaper la commande `/say`.",
                        embeds: [],
                        components: []
                    });
                }

                if (customId === 'say_cancel') {
                    pendingSayMessages.delete(interaction.user.id);
                    return interaction.update({
                        content: "❌ Envoi du message annulé.",
                        embeds: [],
                        components: []
                    });
                }

                if (customId === 'say_ai_fix') {
                    await interaction.deferUpdate();
                    const { correctSpellingWithAI } = require('../utils/aiCorrection');
                    const correctedText = await correctSpellingWithAI(pending.text);
                    pending.text = correctedText;
                    pendingSayMessages.set(interaction.user.id, pending);

                    const updatedEmbed = new EmbedBuilder()
                        .setTitle("📢 Prévisualisation du message (Corrigé par l'IA ✨)")
                        .setDescription(`Voici le texte après correction qui sera envoyé dans <#${pending.channelId}> :`)
                        .addFields(
                            { name: "Texte corrigé", value: correctedText },
                            { name: "Texte original", value: pending.originalText }
                        )
                        .setColor("#2ECC71")
                        .setFooter({ text: "Cliquez sur 'Confirmer et Envoyer' pour poster le message." });

                    const row = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('say_confirm')
                                .setLabel('✅ Confirmer et Envoyer')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('say_cancel')
                                .setLabel('❌ Annuler')
                                .setStyle(ButtonStyle.Secondary)
                        );

                    return interaction.editReply({
                        embeds: [updatedEmbed],
                        components: [row]
                    });
                }

                if (customId === 'say_confirm') {
                    const targetChannel = await interaction.guild?.channels.fetch(pending.channelId).catch(() => null);
                    if (!targetChannel || !targetChannel.isTextBased()) {
                        return interaction.update({
                            content: "❌ Le salon de destination est introuvable ou invalide.",
                            embeds: [],
                            components: []
                        });
                    }

                    try {
                        await targetChannel.send({ content: pending.text });
                        pendingSayMessages.delete(interaction.user.id);
                        return interaction.update({
                            content: `✅ Le message a été publié avec succès dans <#${pending.channelId}> !`,
                            embeds: [],
                            components: []
                        });
                    } catch (e) {
                        return interaction.update({
                            content: "❌ Une erreur est survenue lors de l'envoi du message dans le salon.",
                            embeds: [],
                            components: []
                        });
                    }
                }
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
