---
name: rof-workflow
description: Guide le workflow complet du projet ROF : génération de PDFs de test, parsing, vérification du JSON, et test de l'extension Chrome. Utilise ce skill pour une démonstration ou une validation end-to-end.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash, Read, Glob
---

# Workflow complet — ROF PDF Parser

Ce skill guide une validation end-to-end du projet, de la génération des PDFs jusqu'à la soumission via l'extension Chrome.

## Étape 1 — Préparer l'environnement

Vérifie que les dépendances sont installées :
```bash
npm install
```

Réinitialise les dossiers de travail (supprime les anciens fichiers convertis) :
```bash
npm run reset
```

## Étape 2 — Générer les PDFs de test

```bash
npm run generate
```

Vérifie que les 8 PDFs sont bien présents à la racine :
```bash
ls test*.pdf
```

## Étape 3 — Parser les PDFs

```bash
npm run run
```

**Résultats attendus :**
- `test1_ok.pdf` à `test4_ok.pdf` → déplacés dans `converted/`, données dans `result_*.json`
- `test5_*` à `test8_*` → déplacés dans `errored/`, rapport dans `errors_*.txt`

Lis le fichier JSON produit pour vérifier la normalisation des données :
```bash
# Lire le JSON produit (remplace la date)
ls converted/result_*.json
```

Vérifie notamment :
- Les noms sont en MAJUSCULES
- Les prénoms ont chaque partie capitalisée
- Les emails sont en minuscules
- Les téléphones sont au format `06 12 34 56 78`
- Les dates sont au format `DD/MM/YYYY`

## Étape 4 — Démarrer les serveurs

Dans deux terminaux séparés :
```bash
npm run server   # Port 3001 — API pour l'extension
npm run sim      # Port 3002 — Simulateur Oval-e
```

Vérifie que le serveur API répond :
```bash
curl http://localhost:3001/files
```
Doit retourner la liste des fichiers JSON dans `converted/`.

## Étape 5 — Tester l'extension Chrome

1. Ouvrir Chrome et aller sur `chrome://extensions`
2. Activer le "Mode développeur"
3. "Charger l'extension non empaquetée" → sélectionner le dossier `ChromeExtension/`
4. Ouvrir `http://localhost:3002` dans un onglet Chrome
5. Cliquer sur l'icône de l'extension

**Tests à effectuer :**
- [ ] L'extension affiche les personnes du JSON
- [ ] Bouton "Soumettre" sur un item → HTTP 201 → item disparaît
- [ ] Activer "erreurs aléatoires" dans la barre sim → bouton "↺ Réessayer" apparaît sur un item en erreur
- [ ] Bouton "▶ Tout traiter" → traitement séquentiel de tous les items
- [ ] Bouton "⏸ Pause" → arrêt propre, fichier JSON mis à jour avec les restants
- [ ] Bouton "⟳ Actualiser" → recharge la liste depuis le serveur

## Étape 6 — Vérifier l'état final

```bash
ls converted/
ls errored/
```

Tous les items traités avec succès doivent avoir disparu du JSON (ou le JSON supprimé si tous traités).

## En cas de problème

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Extension n'affiche rien | Serveur API non démarré | `npm run server` |
| "Ouvrez d'abord localhost:3002" | Onglet sim absent | Ouvrir `http://localhost:3002` |
| Tous les PDFs vont dans errored/ | Template PDF absent | Vérifier `misc/sampleTest_ok.pdf` |
| PATCH ne met pas à jour le fichier | Corps JSON mal formaté | Vérifier les headers `Content-Type: application/json` |
