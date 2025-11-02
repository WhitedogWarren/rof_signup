# Extracteur de formulaires PDF - ROF Signup

Script automatique pour extraire les données des formulaires PDF d'inscription.

## Installation

```bash
npm install
```

## Utilisation

### Extraction des formulaires PDF

1. Placez vos fichiers PDF dans le dossier principal du projet
2. Lancez le script d'extraction :

```bash
npm run run
# ou
node rof-signup.js
```

3. Les fichiers JSON sont automatiquement créés dans `converted/`
4. Les PDFs traités sont déplacés dans `converted/`

### Réinitialisation du projet

Pour remettre le projet à zéro (redéplacer les PDFs et supprimer les JSON) :

```bash
npm run reset
```

Ce script :
- Redéplace tous les PDFs de `./converted/` et `./errored/` vers la racine du projet
- Supprime tous les fichiers JSON générés
- Vous permet de relancer le traitement facilement

## Fonctionnalités

 ✅ Extraction automatique de tous les champs du formulaire<br>
 ✅ Support des champs texte, checkboxes, dropdowns, radio buttons<br>
 ✅ Extraction complète du champ date de naissance (`Date3_af_date`)<br>
 ✅ Validation stricte des champs obligatoires (Nom, Prénom, date de naissance)<br>
 ✅ Génération de fichiers JSON nommés selon le format `Nom_Prénom_JJ-MM-AAAA.json`<br>
 ✅ Déplacement automatique des PDFs traités dans `converted/` ou `errored/`<br>
 ✅ Gestion robuste des erreurs avec messages clairs<br>
 ✅ Script de réinitialisation pour recommencer facilement

## Structure des fichiers générés

```json
{
  "Nom": "Dupont",
  "Prénom": "Jean",
  "Date3_af_date": "01/01/2001",
  "Dropdown2": "M",
  "Téléphone fixe": "0123456789",
  "Adresse": "123 rue Example",
  ...
}
```

## Scripts npm disponibles

| Commande | Description |
|----------|-------------|
| `npm run run` | Lance l'extraction des formulaires PDF |
| `npm run reset` | Réinitialise le projet (redéplace PDFs, supprime JSONs) |

## Dépannage

**Le fichier PDF n'est pas déplacé automatiquement**
→ Normal sous Windows si un processus verrouille le fichier. Le JSON est quand même créé.

**Erreur "EBUSY: resource busy"**
→ Fermez tous les lecteurs PDF et réessayez.

**Je veux recommencer le traitement**
→ Lancez `npm run reset` pour remettre tous les PDFs à la racine et supprimer les JSON générés.

## Structure du projet

```
pdf-parser/
├── rof-signup.js          Fichier principal d'extraction
├── reset.js               Script de réinitialisation
├── package.json           Configuration npm
├── README.md              Ce fichier
├── converted/             PDFs traités avec succès + JSONs générés
├── errored/               PDFs avec erreurs de validation
└── node_modules/          Dépendances npm
```
