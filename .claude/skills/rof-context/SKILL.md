---
name: rof-context
description: Charge le contexte complet du projet ROF PDF Parser. Utilise ce skill au début d'une session ou quand tu as besoin de rappeler l'architecture du projet.
disable-model-invocation: true
user-invocable: true
---

# Contexte — Projet ROF PDF Parser

## Vue d'ensemble

Ce projet parse des PDFs de formulaires d'inscription rugby (club ROF), extrait les données en JSON, et les injecte dans le formulaire d'affiliation en ligne Oval-e via une extension Chrome.

## Architecture

```
pdf-parser/
├── rof-signup.js          # Script principal : parse les PDFs → JSON + Excel
├── server.js              # Express API (port 3001) : sert les JSON à l'extension
├── reset.js               # Réinitialise les dossiers converted/ et errored/
├── generate-test-pdfs.js  # Génère 8 PDFs de test avec faker-js
├── misc/
│   ├── sampleTest_ok.pdf  # Template PDF de référence pour les tests
│   └── Fichier xls.xlsx   # Excel de suivi mis à jour automatiquement
├── converted/             # PDFs valides déplacés ici + fichiers JSON produits
├── errored/               # PDFs invalides déplacés ici + rapports d'erreur
├── ChromeExtension/
│   ├── manifest.json      # Manifest V3 : permissions tabs + scripting
│   ├── popup.html         # UI du popup (420px)
│   ├── popup.js           # Logique popup : chargement, soumission, lot, pause
│   └── content.js         # Content script : remplit et soumet le formulaire
└── SimServer/
    ├── sim-server.js      # Serveur simulation Oval-e (port 3002)
    └── ovalie-sim.html    # Page HTML simulant le formulaire d'affiliation
```

## Scripts npm disponibles

| Commande         | Description |
|------------------|-------------|
| `npm run run`    | Lance le parser PDF (traite tous les PDFs à la racine) |
| `npm run server` | Démarre l'API Express sur le port 3001 |
| `npm run sim`    | Démarre le serveur de simulation sur le port 3002 |
| `npm run generate` | Génère 8 PDFs de test dans la racine du projet |
| `npm run reset`  | Vide les dossiers converted/ et errored/ |

## Flux de traitement

1. L'utilisateur dépose des PDFs à la racine du projet
2. `npm run run` parse chaque PDF, normalise les données, valide
   - Valide → déplacé dans `converted/`, ajouté au JSON et à l'Excel
   - Invalide → déplacé dans `errored/`, ajouté au rapport d'erreurs
3. `npm run server` sert les JSONs de `converted/` à l'extension Chrome
4. L'extension affiche les personnes à traiter
5. L'utilisateur clique "Soumettre" ou "Tout traiter"
6. `content.js` remplit le formulaire et soumet via fetch (contexte page = cookies inclus)
7. Sur HTTP 200/201 → item supprimé, fichier JSON mis à jour via PATCH ou DELETE

## Conventions de données

### Champs obligatoires (validés par rof-signup.js)
- Nom, Prénom, Date de naissance, Sexe, Adresse mail (regex), Code postal naissance (5 chiffres), Ville de naissance

### Normalisation appliquée automatiquement
- **Noms** : MAJUSCULES
- **Prénoms** : Première Lettre De Chaque Partie (espace ou tiret comme séparateur)
- **Emails** : minuscules, sans espaces
- **Téléphones** : `06 12 34 56 78` (groupes de 2, +33 converti en 0)
- **Date de naissance** : DD/MM/YYYY

### Correspondance JSON → formulaire Oval-e (content.js)
| JSON             | Champ formulaire       | Note |
|------------------|------------------------|------|
| Nom              | Nom + NomUsage         | Dupliqué |
| Prénom           | Prenom                 | |
| Adresse mail     | Email + ConfirmEmail   | Dupliqué |
| Ville de naissance | VilleNaissance       | |
| Date de naissance | DateNaissance         | DD/MM/YYYY → YYYY-MM-DD |
| Sexe             | RefSexeId              | M→1, F→2 |
| Code postal naissance | RefDepartementsInseeId | 2 premiers chiffres |
| —                | RefPaysNationaliteId   | Fixe : 99100 (Française) |
| —                | RefPaysInseeNaissanceId | Fixe : 100 (France) |

## Points en suspens (voir todo.txt)
- Nom de naissance vs nom d'usage (champ PDF à ajouter ?)
- Nationalité et pays de naissance (fixés en dur pour l'instant)
- Département de résidence distinct du code postal de naissance

## Technologies
- Node.js ESM (`"type": "module"`)
- pdf-lib (lecture/écriture AcroForm PDF)
- xlsx (export Excel)
- @faker-js/faker locale fr (génération de données de test)
- Express 5 (serveurs API et simulation)
- Chrome Extension Manifest V3 (tabs, scripting, content_scripts)
