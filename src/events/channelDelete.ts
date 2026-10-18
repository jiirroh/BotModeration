import { Events, GuildChannel, AuditLogEvent } from 'discord.js';
import { prisma } from '../utils/database';

const actionCounter = new Map<string, { count: number, timeout: NodeJS.Timeout }>();

export default {
    name: Events.ChannelDelete,
    once: false,
    async execute(channel: GuildChannel) {
        if (!channel.guild) return;

        // Attendre pour l'audit log
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const auditLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelDelete,
            });

            const log = auditLogs.entries.first();
            if (!log || !log.executor) return;

            const executorId = log.executor.id;
            
            if (executorId === channel.guild.client.user.id) return;

            const config = await prisma.guildConfig.findUnique({ where: { guildId: channel.guild.id } });
            if (!config || !config.antiNukeEnabled) return;

            let userData = actionCounter.get(executorId);
            if (!userData) {
                userData = {
                    count: 1,
                    timeout: setTimeout(() => {
                        actionCounter.delete(executorId);
                    }, 10000)
                };
            } else {
                userData.count++;
            }
            actionCounter.set(executorId, userData);

            // Si plus de N salons supprimés en 10s
            if (userData.count >= config.antiNukeChannelThreshold) {
                console.log(`[ANTI-NUKE] ${log.executor.tag} a supprimé trop de salons !`);
                
                const member = await channel.guild.members.fetch(executorId).catch(() => null);
                if (member && member.manageable) {
                    // Neutralisation selon paramètre
                    if (config.antiNukeAction === 'BAN') {
                        await member.ban({ reason: 'Anti-Nuke: Suppression massive de salons' }).catch(console.error);
                    } else if (config.antiNukeAction === 'KICK') {
                        await member.kick('Anti-Nuke: Suppression massive de salons').catch(console.error);
                    } else {
                        await member.roles.set([]).catch(console.error);
                    }

                    if (config.logChannelId) {
                        const logChannel = await channel.guild.channels.fetch(config.logChannelId).catch(() => null);
                        if (logChannel && logChannel.isTextBased()) {
                            await logChannel.send({
                                content: `🚨 **ALERTE ANTI-NUKE** 🚨\nL'administrateur <@${executorId}> a effectué des suppressions de salons en masse (>${config.antiNukeChannelThreshold} en 10s).\n**Action prise :** ${config.antiNukeAction}`
                            });
                        }
                    }

                    await prisma.log.create({
                        data: {
                            guildId: channel.guild.id,
                            actionType: 'ANTI_NUKE',
                            targetId: executorId,
                            moderatorId: channel.guild.client.user.id,
                            details: JSON.stringify({ reason: 'Suppression massive de salons', action: config.antiNukeAction })
                        }
                    });
                }
                actionCounter.delete(executorId);
            }

        } catch (error) {
            console.error('Erreur dans Anti-Nuke (ChannelDelete):', error);
        }
    }
};
