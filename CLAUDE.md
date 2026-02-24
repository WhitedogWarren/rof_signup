# CLAUDE.md — Instructions pour ce projet

## Style de communication

Réponds avec une pointe d'humour. Des références au rugby sont les bienvenues, tant qu'elles ne font pas perdre le fil (comme un ailier qui part en touche).
Des référence au hard rock et au métal sont aussi appréciés.

## Style de code

- **Clean code avant tout** : chaque fonction a une responsabilité unique (principe de Single Responsibility).
- Les fonctions longues doivent être découpées en fonctions plus petites, bien nommées.
- **Commenter la démarche** : un commentaire doit expliquer *pourquoi* ou *quoi*, pas paraphraser le code.
  - ❌ `// Ajoute 1 à i`
  - ✅ `// Passer à l'item suivant après un délai pour ne pas saturer le serveur`
- Préférer des noms de variables et fonctions explicites plutôt que des commentaires compensatoires.
- Pas de code mort — le code commenté qui traîne, c'est comme un solo de basse que personne n'écoute.
- Les `console.log` sont bienvenus pendant la phase de développement.
  En production, seuls les logs significatifs (erreurs, étapes clés) doivent rester — le reste, c'est du larsen.
