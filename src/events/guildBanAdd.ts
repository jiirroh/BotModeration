import { Events, GuildBan, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../utils/database';

// Système en mémoire pour tracker les actions rapides (Anti-Nuke)
const actionCounter = new Map<string, { count: number, timeout: NodeJS.Timeout }>();

export default {
    name: Events.GuildBanAdd,
    once: false,
    async execute(ban: GuildBan) {
        if (!ban.guild) return;

        // Attendre un tout petit peu pour que l'audit log soit disponible
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const auditLogs = await ban.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberBanAdd,
            });

            const banLog = auditLogs.entries.first();
            if (!banLog || !banLog.executor) return;

            const executorId = banLog.executor.id;
            
            // Si c'est le bot lui-même, on ignore
            if (executorId === ban.guild.client.user.id) return;

            // Vérification en BDD si l'anti-nuke est activé
            const config = await prisma.guildConfig.findUnique({ where: { guildId: ban.guild.id } });
            if (!config || !config.antiNukeEnabled) return;

            // Tracking des actions
            let userData = actionCounter.get(executorId);
            if (!userData) {
                userData = {
                    count: 1,
                    timeout: setTimeout(() => {
                        actionCounter.delete(executorId);
                    }, 10000) // Reset après 10 secondes
                };
            } else {
                userData.count++;
                // Refresh du timer (Optionnel)
            }
            actionCounter.set(executorId, userData);

            // Si plus de N bans en 10 secondes -> ANTI-NUKE DÉCLENCHÉ
            if (userData.count >= config.antiNukeBanThreshold) {
                console.log(`[ANTI-NUKE] ${banLog.executor.tag} a banni trop de monde d'un coup !`);
                
                const member = await ban.guild.members.fetch(executorId).catch(() => null);
                if (member && member.manageable) {
                    
                    if (config.antiNukeAction === 'BAN') {
                        await member.ban({ reason: 'Anti-Nuke: Bannissements de masse détectés' }).catch(console.error);
                    } else if (config.antiNukeAction === 'KICK') {
                        await member.kick('Anti-Nuke: Bannissements de masse détectés').catch(console.error);
                    } else {
                        // REMOVE_ROLES par défaut
                        await member.roles.set([]).catch(console.error);
                    }

                    // Alerter dans le salon des logs
                    if (config.logChannelId) {
                        const logChannel = await ban.guild.channels.fetch(config.logChannelId).catch(() => null);
                        if (logChannel && logChannel.isTextBased()) {
                            await logChannel.send({
                                content: `🚨 **ALERTE ANTI-NUKE** 🚨\nL'administrateur <@${executorId}> a effectué des bannissements en masse (>${config.antiNukeBanThreshold} bans en 10s).\n**Action prise :** ${config.antiNukeAction}`
                            });
                        }
                    }

                    // Enregistrer dans la BDD
                    await prisma.log.create({
                        data: {
                            guildId: ban.guild.id,
                            actionType: 'ANTI_NUKE',
                            targetId: executorId,
                            moderatorId: ban.guild.client.user.id,
                            details: JSON.stringify({ reason: 'Bannissements de masse', action: config.antiNukeAction })
                        }
                    });
                }
                actionCounter.delete(executorId); // On clear pour ne pas boucler
            }

        } catch (error) {
            console.error('Erreur dans Anti-Nuke (GuildBanAdd):', error);
        }
    }
};
