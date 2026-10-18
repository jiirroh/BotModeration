/**
 * Utilitaire pour corriger l'orthographe et la grammaire d'un texte via l'API Mistral AI
 */
export async function correctSpellingWithAI(text: string): Promise<string> {
    const mistralApiKey = process.env.MISTRAL_API_KEY;
    if (!mistralApiKey || mistralApiKey === 'fictive_key') {
        return text;
    }

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-tiny',
                messages: [
                    {
                        role: 'system',
                        content: "Tu es un correcteur orthographique et grammatical professionnel. Ta tâche est de corriger le texte fourni en français sans en changer le sens, le ton ou le style. Conserve les emojis et la ponctuation expressive. RÈGLE CRITIQUE : Ne réponds RIEN d'autre que le texte corrigé strict (aucun commentaire, aucune politesse, aucune explication, pas de guillemets autour)."
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.2
            })
        });

        if (response.ok) {
            const data: any = await response.json();
            const corrected = data.choices?.[0]?.message?.content?.trim();
            if (corrected && corrected.length > 0) {
                return corrected;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la correction orthographique avec Mistral AI:', error);
    }

    return text;
}
