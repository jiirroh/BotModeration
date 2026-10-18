# Bot de Modération Discord (Hybride Regex / IA)

Ce projet est un bot de modération Discord avancé. Il utilise une double technologie : 
- **Des filtres Regex instantanés** pour les insultes et liens frauduleux.
- **L'Intelligence Artificielle (Mistral AI)** pour analyser le contexte lors de comportements suspects (Spam, répétitions).

## 🔑 Configuration des Clés API (Hébergement)

Pour que le bot puisse fonctionner sur votre serveur, il nécessite trois clés d'accès indispensables. Ces clés doivent être renseignées dans les variables d'environnement de votre hébergeur, ou dans le fichier `.env` à la racine du projet :

- `DISCORD_TOKEN` : Le Token secret de votre bot. Il s'obtient sur la page "Bot" du [Discord Developer Portal](https://discord.com/developers/applications). *(Important : Veillez à bien cocher les 3 "Privileged Gateway Intents" sur cette même page).*
- `CLIENT_ID` : L'identifiant public de votre application Discord (Trouvable sur la page "General Information").
- `MISTRAL_API_KEY` : Votre clé d'accès à l'Intelligence Artificielle. Elle peut être générée sur [console.mistral.ai](https://console.mistral.ai).

## ⚙️ Configuration Initiale sur Discord

Une fois le bot invité et en ligne sur votre serveur, tapez la commande suivante n'importe où :
**/panel**

Cela va ouvrir le Panneau d'Administration interactif complet du bot. Depuis ce panneau, vous pourrez tout gérer via des boutons et menus déroulants :
- **⚙️ Configuration Base** : Pour sélectionner vos salons (Logs, Honeypot) et vos rôles (Staff, Quarantaine).
- **🛡️ Anti-Nuke & Anti-Raid** : Pour activer la protection contre les suppressions de salons massives et les bannissements abusifs, et définir vos seuils et sanctions personnalisés.
- **🤖 IA & Filtres** : Pour gérer la liste noire (censure instantanée des mots interdits).

---

## 🛠️ Commandes disponibles

### Modération Directe
- `/warn <@utilisateur> <raison>` : Avertit un utilisateur.
- `/timeout <@utilisateur> <durée>` : Rend muet un utilisateur.
- `/kick <@utilisateur> <raison>` : Expulse l'utilisateur du serveur.
- `/ban <@utilisateur> <raison>` : Bannit l'utilisateur.

### Administration et Historique
- `/panel` : Ouvre le centre de contrôle interactif pour configurer le bot, gérer les mots bannis et la sécurité Anti-Nuke.
- `/search utilisateur:@Membre` : Affiche l'historique complet de modération d'un membre (avertissements et actions de l'IA).
- `/search texte:spam` : Cherche un mot précis (comme "spam" ou "insulte") dans la base de données globale du bot.
- `/panic` : Arrêt d'urgence du bot. À n'utiliser qu'en cas de suspicion de piratage.
