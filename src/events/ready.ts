import { Events, Client } from 'discord.js';
import { prisma } from '../utils/database';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
        try {
            await prisma.$connect();
            console.log('Connected to the database.');
        } catch (error) {
            console.error('Failed to connect to the database:', error);
        }
    },
};
