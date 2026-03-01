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

## Complexité cognitive

- La complexité cognitive maximale par fonction est **15** (limite SonarQube).
- Les fonctions d'orchestration ne doivent contenir **aucune logique métier** :
  elles appellent des fonctions dédiées, une par responsabilité.
  - ❌ Un `if` imbriqué dans un `for` dans une fonction qui fait déjà autre chose
  - ✅ `normalizeNames(data)`, `normalizePhones(data)` — chacune fait une seule chose
- Extraire toute logique de transformation dans une fonction nommée, même courte.
- Préférer des listes de données (tableaux de constantes, maps) aux blocs if/else répétitifs
  pour les validations et transformations de même nature.

## Bonnes pratiques JavaScript (SonarQube)

- Utiliser `String#replaceAll()` plutôt que `String#replace()` avec le flag `g`.
- Quand `replaceAll` remplace un caractère ou une chaîne fixe (pas de pattern), passer une **string littérale**,
  pas une regex : `replaceAll('\\', '/')` plutôt que `replaceAll(/\\/g, '/')`.
- Utiliser `\d` plutôt que `[0-9]` dans les expressions régulières.
- Pas d'échappement inutile dans les classes de caractères :
  `[/-]` plutôt que `[\/\-]` — le slash et le tiret en fin de classe n'ont pas besoin d'être échappés.
- Dans un bloc `catch`, toujours nommer le paramètre `error_` (underscore final),
  que le paramètre soit utilisé ou non — convention SonarQube (S7718).
- Quand une exception est intentionnellement non propagée pour des raisons de sécurité
  (ex : ne pas fuiter les détails système au client), ajouter `// NOSONAR` sur la ligne `catch`
  avec une explication : `// NOSONAR — message générique intentionnel : ne pas fuiter les détails système`.
- Pas de ternaires imbriqués : extraire le ternaire interne dans une variable nommée avant de l'utiliser
  dans l'expression principale.
  - ❌ `status ? \`Erreur ${status}${message ? ' — ' + message : ''}\` : (message || 'Erreur inconnue')`
  - ✅ `const detail = message ? \` — ${message}\` : ''; status ? \`Erreur ${status}${detail}\` : ...`
- Dans les scripts ES modules (`type="module"`), préférer le **top-level await** plutôt qu'une fonction
  `async` appelée sans `await` en fin de fichier — les erreurs ne sont pas silencieusement avalées.
  - ❌ `async function init() { ... } init();`
  - ✅ code async directement au niveau supérieur, ou `await init();`
- Les regexes issues de standards (RFC 5322 pour les emails, etc.) sont conservées telles quelles,
  même si SonarQube propose une simplification — documenter l'intention par un commentaire.

## Organisation du code

- Une fonction d'orchestration est **immédiatement suivie** des fonctions qu'elle appelle,
  dans l'ordre où elles sont appelées.
  - ✅ `checkData` → `listMissingFields` → `listInvalidFormats` → `buildErrorReport`
- Les constantes de configuration (listes de champs, regexes, maps de validation)
  sont déclarées **en haut du fichier**, après les imports, avant toute fonction.
