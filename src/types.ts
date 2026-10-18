import { ChatInputCommandInteraction, SlashCommandBuilder, Client, Collection } from 'discord.js';

export interface Command {
    data: any;
    execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
}

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}
