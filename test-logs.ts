import { prisma } from './src/utils/database';

async function main() {
    console.log('Création de logs de test...');

    await prisma.log.create({
        data: {
            guildId: '123456789',
            actionType: 'TEST',
            targetId: '987654321',
            moderatorId: 'System',
            details: JSON.stringify({ message: "Ceci est un test système généré par l'IA pour vérifier le dashboard." })
        }
    });

    await prisma.log.create({
        data: {
            guildId: '123456789',
            actionType: 'AI_FILTER',
            targetId: '111111111',
            details: JSON.stringify({ reason: 'Tentative de spam détectée (Test)' })
        }
    });

    await prisma.warn.create({
        data: {
            userId: '111111111',
            guildId: '123456789',
            reason: 'Test Warn',
            moderatorId: 'System'
        }
    });

    console.log('Logs générés avec succès ! Allez voir le dashboard sur http://localhost:3001');
}

main().catch(console.error).finally(() => prisma.$disconnect());
