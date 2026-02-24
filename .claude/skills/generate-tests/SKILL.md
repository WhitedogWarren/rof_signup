---
name: generate-tests
description: Génère les PDFs de test pour le projet ROF et explique comment les utiliser. Utilise ce skill quand l'utilisateur veut tester le parser rof-signup.js.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash
---

# Générer les PDFs de test

## Ce que fait le script

`generate-test-pdfs.js` utilise `@faker-js/faker` (locale `fr`) et le template `misc/sampleTest_ok.pdf` pour produire 8 PDFs à la racine du projet :

| Fichier | Contenu |
|---------|---------|
| `test1_ok.pdf` à `test4_ok.pdf` | Formulaires valides avec données aléatoires réalistes |
| `test5_manque_nom.pdf` | Champ Nom vide → doit être rejeté |
| `test6_email_invalide.pdf` | Email malformé (`pasunemail`) → doit être rejeté |
| `test7_code_postal_invalide.pdf` | Code postal `123` (3 chiffres) → doit être rejeté |
| `test8_manque_ville_naissance.pdf` | Champ Ville de naissance vide → doit être rejeté |

## Étapes

1. Vérifie que le template existe :
   ```bash
   ls misc/sampleTest_ok.pdf
   ```
   S'il est absent, il faut le copier depuis un PDF de formulaire valide.

2. Lance la génération :
   ```bash
   npm run generate
   ```

3. Vérifie que les 8 fichiers sont bien créés à la racine :
   ```bash
   ls test*.pdf
   ```

4. Pour tester le parser sur les PDFs générés :
   ```bash
   npm run run
   ```
   - Les 4 PDFs valides doivent être déplacés dans `converted/` et leurs données ajoutées au JSON et à l'Excel.
   - Les 4 PDFs invalides doivent être déplacés dans `errored/` avec un rapport d'erreur.

## Résultats attendus

Après `npm run run` :
- `converted/` contient `test1_ok.pdf` à `test4_ok.pdf` + un fichier `result_*.json` + l'Excel mis à jour
- `errored/` contient `test5_*` à `test8_*` + un fichier `errors_*.txt` détaillant les champs manquants

## Remarque
Les PDFs de test sont générés à la racine du projet. Si des PDFs de tests précédents sont encore là (non traités), ils seront traités en même temps. Utilise `npm run reset` pour vider `converted/` et `errored/` avant de relancer, mais cela ne supprime pas les PDFs de la racine — il faut les supprimer manuellement ou relancer `npm run generate` qui les écrase.
