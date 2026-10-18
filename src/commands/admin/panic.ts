import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types';

const panicCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('panic')
        .setDescription('🚨 ARRÊT D\'URGENCE : Déconnecte et coupe totalement le bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction: ChatInputCommandInteraction) {
        // Double vérification par sécurité (bien que setDefaultMemberPermissions protège déjà la commande)
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'Accès refusé.', ephemeral: true });
            return;
        }

        try {
            await interaction.reply({ 
                content: '🛑 **ARRÊT D\'URGENCE DÉCLENCHÉ.**\nDéconnexion des serveurs Discord et arrêt du processus en cours...', 
                ephemeral: false 
            });

            console.error(`[URGENCE] Bouton Panic déclenché par ${interaction.user.tag} (ID: ${interaction.user.id}). Arrêt du bot.`);
            
            // 1. Déconnexion propre de l'API Discord
            interaction.client.destroy();

            // 2. Arrêt brutal du processus Node.js après 1 seconde (pour laisser le temps au message de s'envoyer)
            setTimeout(() => {
                process.exit(1); 
            }, 1000);

        } catch (error) {
            console.error('Erreur lors de l\'arrêt d\'urgence:', error);
            process.exit(1);
        }
    },
};

export default panicCommand;
