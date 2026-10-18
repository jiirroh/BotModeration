import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    PermissionFlagsBits, 
    ChannelType, 
    TextChannel, 
    NewsChannel, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} from 'discord.js';
import { Command } from '../../types';

// Map en mémoire pour stocker les messages en attente de confirmation
// Clé: userId, Valeur: { channelId: string, text: string, originalText: string }
export const pendingSayMessages = new Map<string, { channelId: string; text: string; originalText: string }>();

const sayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription("📢 Prépare un message pour le salon de votre choix avec correction IA (Réservé aux Admins).")
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

        const targetChannel = await interaction.guild?.channels.fetch(channelOption.id).catch(() => null);

        if (!targetChannel || (!targetChannel.isTextBased() || !(targetChannel instanceof TextChannel || targetChannel instanceof NewsChannel))) {
            await interaction.reply({
                content: "❌ Le salon choisi doit être un salon textuel valide.",
                ephemeral: true
            });
            return;
        }

        // Sauvegarde en attente de validation
        pendingSayMessages.set(interaction.user.id, {
            channelId: targetChannel.id,
            text: textToSend,
            originalText: textToSend
        });

        const embed = new EmbedBuilder()
            .setTitle("📢 Prévisualisation du message")
            .setDescription(`Voici l'aperçu du message qui sera envoyé dans <#${targetChannel.id}> :`)
            .addFields(
                { name: "Texte actuel", value: textToSend }
            )
            .setColor("#5865F2")
            .setFooter({ text: "Cliquez sur 'Corriger avec l'IA' pour corriger les fautes ou 'Confirmer' pour envoyer." });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('say_confirm')
                    .setLabel('✅ Confirmer et Envoyer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('say_ai_fix')
                    .setLabel("✨ Corriger avec l'IA")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('say_cancel')
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },
};

export default sayCommand;
