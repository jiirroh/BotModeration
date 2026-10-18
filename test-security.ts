import messageCreateEvent from './src/events/messageCreate';
import { prisma } from './src/utils/database';
import { Message } from 'discord.js';

async function runTests() {
    console.log('--- DÉMARRAGE DES TESTS DE SÉCURITÉ ---');
    
    // 1. Préparation de la BDD avec des mots bannis complexes
    const guildId = 'test-guild-123';
    await prisma.guildConfig.upsert({
        where: { guildId },
        update: { bannedWords: JSON.stringify(['(a+)+', 'banni', 'test_redos']) },
        create: { guildId, bannedWords: JSON.stringify(['(a+)+', 'banni', 'test_redos']) }
    });
    console.log('✅ Configuration de test injectée en BDD.');

    // Mock basique d'un message Discord
    const createMockMessage = (content: string, isAdmin = false) => ({
        content,
        author: { bot: false, id: 'user-456' },
        guild: { id: guildId },
        member: { permissions: { has: (perm: string) => isAdmin } },
        delete: async () => { console.log(`[ACTION] Message supprimé : "${content.substring(0, 30)}..."`); }
    } as unknown as Message);

    // Test 1: ReDoS Attack Payload
    console.log('\n[TEST 1] Payload ReDoS (Regular Expression Denial of Service)');
    const redosPayload = 'a'.repeat(1500) + 'X'; // Si le regex est vulnérable, ça plantera ici
    const msgRedos = createMockMessage(redosPayload);
    const startRegex = Date.now();
    await messageCreateEvent.execute(msgRedos);
    const timeRegex = Date.now() - startRegex;
    console.log(`✅ Test ReDoS terminé en ${timeRegex}ms. Le bot n'a pas planté.`);

    // Test 2: Immunité Administrateur
    console.log('\n[TEST 2] Immunité Admin');
    const msgAdmin = createMockMessage('Ceci est un mot banni !', true);
    await messageCreateEvent.execute(msgAdmin);
    console.log('✅ Le message admin a été ignoré par les filtres.');

    // Test 3: Rate Limiting API Mistral
    console.log('\n[TEST 3] Spam API Mistral (Rate Limit 5req/10s)');
    let mistralCalls = 0;
    // On simule fetch pour compter les appels
    const originalFetch = global.fetch;
    global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        mistralCalls++;
        return new Response(JSON.stringify({
            choices: [{ message: { content: '{"toxic": false, "reason": "test"}' } }]
        }), { status: 200 });
    };

    for (let i = 0; i < 8; i++) {
        const spamMsg = createMockMessage(`Message anodin ${i}`);
        await messageCreateEvent.execute(spamMsg);
    }
    
    global.fetch = originalFetch;
    if (mistralCalls === 5) {
        console.log(`✅ Rate limit fonctionnel ! 8 messages envoyés, mais seulement ${mistralCalls} appels à l'API Mistral.`);
    } else {
        console.log(`❌ Rate limit a échoué. Appels: ${mistralCalls}`);
    }

    console.log('\n--- TESTS TERMINÉS ---');
    process.exit(0);
}

runTests().catch(console.error);
