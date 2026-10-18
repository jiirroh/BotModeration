import { Events, GuildMember } from 'discord.js';
import { prisma } from '../utils/database';

export default {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member: GuildMember) {
        if (member.user.bot) return;

        // Configuration de la limite d'âge de compte
        const accountAgeLimit = 7 * 24 * 60 * 60 * 1000; // 7 jours
        const accountAge = Date.now() - member.user.createdAt.getTime();
        const hasNoAvatar = !member.user.avatar; // pas de photo de profil

        // Vérification: âge du compte récent et pas de photo de profil
        if (accountAge < accountAgeLimit && hasNoAvatar) {
            const config = await prisma.guildConfig.findUnique({
                where: { guildId: member.guild.id }
            });

            if (config?.quarantineRoleId) {
                const role = member.guild.roles.cache.get(config.quarantineRoleId);
                if (role) {
                    try {
                        await member.roles.add(role);

                        const reason = 'Compte récent (< 7 jours) sans photo de profil';

                        // Création d'une entrée Quarantine en BDD
                        await prisma.quarantine.create({
                            data: {
                                userId: member.id,
                                guildId: member.guild.id,
                                reason: reason
                            }
                        });

                        await prisma.log.create({
                            data: {
                                guildId: member.guild.id,
                                actionType: 'QUARANTINE',
                                targetId: member.id,
                                details: JSON.stringify({ reason })
                            }
                        });

                        // Envoi du message au staff
                        if (config.logChannelId) {
                            const staffChannel = member.guild.channels.cache.get(config.logChannelId);
                            if (staffChannel && staffChannel.isTextBased()) {
                                const pingText = config.staffRoleId ? `<@&${config.staffRoleId}>` : '';
                                
                                const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
                                
                                const embed = {
                                    color: 0xFFA500, // Orange
                                    title: '🚨 Mise en Quarantaine Automatique',
                                    description: `Un nouvel utilisateur suspect a été isolé.`,
                                    fields: [
                                        { name: 'Utilisateur', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                                        { name: 'ID', value: member.id, inline: true },
                                        { name: 'Âge du compte', value: `${accountAgeDays} jour(s)`, inline: true },
                                        { name: 'Photo de profil', value: '❌ Aucune', inline: true },
                                        { name: 'Action Requise', value: `Veuillez valider ou rejeter cet utilisateur via les boutons ci-dessous.` }
                                    ],
                                    timestamp: new Date().toISOString()
                                };

                                // Création des boutons
                                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                                const row = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`quarantine_approve_${member.id}`)
                                            .setLabel('✅ Approuver')
                                            .setStyle(ButtonStyle.Success),
                                        new ButtonBuilder()
                                            .setCustomId(`quarantine_reject_${member.id}`)
                                            .setLabel('🔨 Rejeter (Kick)')
                                            .setStyle(ButtonStyle.Danger)
                                    );

                                await staffChannel.send({ content: `${pingText} Nouvel utilisateur en quarantaine !`, embeds: [embed], components: [row] });
                            }
                        }
                    } catch (error) {
                        console.error('Erreur lors de la quarantaine :', error);
                    }
                }
            }
        }
    }
};
