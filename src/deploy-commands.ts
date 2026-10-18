import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID'] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('Create a .env file based on .env.example before running the sync.');
    process.exit(1);
}

const commands: any[] = [];
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
    console.error(`Commands folder not found: ${commandsPath}`);
    process.exit(1);
}

const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const imported = require(filePath);
        const command = imported.default ?? imported;

        if (command && 'data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

if (commands.length === 0) {
    console.warn('No slash commands were found to sync.');
    process.exit(0);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands },
        ) as any[];

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Failed to sync Discord commands.');
        console.error(error);
        process.exit(1);
    }
})();
