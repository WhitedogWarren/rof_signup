---
name: start
description: Démarre les serveurs du projet ROF (API port 3001 + simulation Oval-e port 3002). Utilise ce skill quand l'utilisateur veut tester l'extension Chrome ou le workflow complet.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash
---

# Démarrer les serveurs ROF

Lance les deux serveurs nécessaires au fonctionnement de l'extension Chrome.

## Étapes

1. Vérifie que les ports 3001 et 3002 ne sont pas déjà occupés :
   ```bash
   netstat -ano | findstr ":3001 :3002"
   ```
   Si des processus occupent ces ports, signale-le à l'utilisateur avant de continuer.

2. Lance le serveur API en arrière-plan :
   ```bash
   npm run server
   ```
   Ce serveur (port 3001) sert les fichiers JSON du dossier `converted/` à l'extension Chrome.

3. Lance le serveur de simulation en arrière-plan :
   ```bash
   npm run sim
   ```
   Ce serveur (port 3002) simule le formulaire Oval-e. L'extension doit détecter un onglet ouvert sur `http://localhost:3002`.

4. Rappelle à l'utilisateur :
   - Ouvrir `http://localhost:3002` dans Chrome avant d'utiliser l'extension
   - Charger l'extension depuis `chrome://extensions` → "Charger l'extension non empaquetée" → dossier `ChromeExtension/`
   - Le mode "erreurs aléatoires" est disponible via la case à cocher dans la barre noire du simulateur

## En cas d'erreur
- `EADDRINUSE` → un serveur tourne déjà sur ce port. Utilise `npm run reset` ne redémarre pas les serveurs — il faut tuer le processus manuellement.
- Module introuvable → lancer `npm install` d'abord.
