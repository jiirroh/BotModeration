import messageCreateEvent from './src/events/messageCreate';
import { prisma } from './src/utils/database';
import { Message } from 'discord.js';

async function runTests() {
    console.log('--- DÉMARRAGE DES TESTS DE FONCTIONNALITÉS ---');
    
    // 1. Préparation de la BDD
    const guildId = 'test-guild-123';
    const honeypotChannelId = 'honeypot-456';
    
    await prisma.guildConfig.upsert({
        where: { guildId },
        update: { 
            bannedWords: JSON.stringify(['scam', 'insulte', 'arnaque']),
            honeypotChannelId: honeypotChannelId
        },
        create: { 
            guildId, 
            bannedWords: JSON.stringify(['scam', 'insulte', 'arnaque']),
            honeypotChannelId: honeypotChannelId
        }
    });
    console.log('✅ Base de données configurée pour les tests.');

    // Mock d'un message Discord complet
    const createMockMessage = (content: string, channelId = 'general-789', isAdmin = false) => {
        let deleted = false;
        return {
            content,
            author: { bot: false, id: 'user-456', toString: () => '@UserTest' },
            guild: { id: guildId },
            channel: { 
                id: channelId,
                send: async (msg: any) => { console.log(`   [BOT-SEND] -> ${msg.content || msg}`); return { delete: async () => {} }; }
            },
            member: { 
                permissions: { has: (perm: string) => isAdmin },
                kick: async (reason: string) => { console.log(`   [BOT-KICK] -> User kicked for: ${reason}`); }
            },
            delete: async () => { deleted = true; console.log(`   [BOT-DELETE] -> Message supprimé`); },
            client: { user: { id: 'bot-999' } }
        } as unknown as Message;
    };

    // --- TEST 1: MOTS BANNIS (REGEX) ---
    console.log('\n[TEST 1] Détection de mot banni (Censure stricte)');
    const msgBanned = createMockMessage('Voici mon lien de scam gratuit !');
    await messageCreateEvent.execute(msgBanned);
    console.log('✅ Vérifiez ci-dessus si le message a été supprimé et loggué (Regex Filter).');

    // --- TEST 2: LE SALON PIÈGE (HONEYPOT) ---
    console.log('\n[TEST 2] Message dans le salon Honeypot');
    const msgHoneypot = createMockMessage("Coucou il y a quelqu'un ?", honeypotChannelId);
    await messageCreateEvent.execute(msgHoneypot);
    console.log("✅ Vérifiez ci-dessus si l'utilisateur a été kick (Honeypot).");

    // --- TEST 3: SPAM & IA MISTRAL ---
    console.log('\n[TEST 3] Spam MAJUSCULES (Déclenchement Points de Suspicion -> IA)');
    // On simule fetch pour l'IA
    const originalFetch = global.fetch;
    global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        console.log(`   [MISTRAL-API] Appel à l'IA effectué !`);
        return new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ toxic: true, reason: "L'utilisateur crie et spamme." }) } }]
        }), { status: 200 });
    };

    console.log('Envoi de 2 messages agressifs...');
    // Premier message (génère des points)
    const spam1 = createMockMessage('VOUS ETES TOUS DES NULS AHAHAHAHAH');
    await messageCreateEvent.execute(spam1);
    
    // Deuxième message (dépasse 5 points -> déclenche l'IA)
    const spam2 = createMockMessage('JE CONTINUE DE CRIER !!!!!!');
    await messageCreateEvent.execute(spam2);
    
    global.fetch = originalFetch;
    console.log("✅ Vérifiez ci-dessus si l'IA a bien été appelée et a émis un avertissement.");

    console.log('\n--- TESTS TERMINÉS ---');
    console.log('Vous pouvez vérifier les logs générés en faisant /search sur Discord !');
    process.exit(0);
}

runTests().catch(console.error);
