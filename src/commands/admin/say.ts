import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel, NewsChannel } from 'discord.js';
import { Command } from '../../types';

const sayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription("📢 Envoie un message dans le salon de votre choix avec le bot (Réservé aux Administrateurs).")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription("Le salon où envoyer le message")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('message')
                .setDescription("Le texte que le bot doit envoyer")
                .setRequired(true)
        ),
    
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: "❌ Vous devez être Administrateur pour utiliser cette commande.",
                ephemeral: true
            });
            return;
        }

        const channelOption = interaction.options.getChannel('salon', true);
        const textToSend = interaction.options.getString('message', true);

        // Fetch channel directly to guarantee GuildText or GuildAnnouncement channel instance
        const targetChannel = await interaction.guild?.channels.fetch(channelOption.id).catch(() => null);

        if (!targetChannel || (!targetChannel.isTextBased() || !(targetChannel instanceof TextChannel || targetChannel instanceof NewsChannel))) {
            await interaction.reply({
                content: "❌ Le salon choisi doit être un salon textuel valide.",
                ephemeral: true
            });
            return;
        }

        try {
            await targetChannel.send({ content: textToSend });
            await interaction.reply({
                content: `✅ Message envoyé avec succès dans <#${targetChannel.id}> !`,
                ephemeral: true
            });
        } catch (error) {
            console.error("Erreur lors de l'envoi du message via /say:", error);
            await interaction.reply({
                content: "❌ Impossible d'envoyer le message dans ce salon. Vérifiez que le bot a bien la permission d'écrire dedans.",
                ephemeral: true
            });
        }
    },
};

export default sayCommand;
