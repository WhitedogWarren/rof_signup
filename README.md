# ROF Signup — Extracteur de formulaires PDF + Extension Chrome

Outil complet pour extraire les données des formulaires PDF d'inscription ROF,
les valider, les exporter en JSON et en Excel, puis les soumettre automatiquement
au site Oval-e via une extension Chrome.

## Installation

```bash
npm install
```

## Utilisation

### 1. Extraction des formulaires PDF

Placez vos fichiers PDF dans le dossier racine du projet, puis lancez :

```bash
npm run run
```

Le script :
- Extrait les données de chaque PDF (champs texte, dates, checkboxes, selects)
- Normalise et valide les données (noms, prénoms, emails, téléphones, dates)
- Déplace les PDFs valides dans `converted/`, les invalides dans `errored/`
- Génère un fichier `result_JJ-MM-AAAA.json` dans `converted/`
- Met à jour le fichier Excel `misc/Fichier xls.xlsx`
- Génère un rapport d'erreurs `errors_JJ-MM-AAAA.txt` dans `errored/`

### 2. Soumission via l'extension Chrome

Le serveur local expose les fichiers JSON extraits à l'extension :

```bash
npm run server   # Serveur API sur http://localhost:3001
npm run sim      # Simulateur du site Oval-e sur http://localhost:3002
```

L'extension Chrome (`ChromeExtension/`) permet de :
- Visualiser les inscriptions extraites fichier par fichier
- Soumettre chaque inscription individuellement au site Oval-e
- Traiter tout le lot automatiquement ("Tout traiter")
- Suspendre le traitement en cours ("Pause") — les records restants sont sauvegardés

### 3. Réinitialisation

Pour remettre le projet à zéro (redéplacer les PDFs, supprimer les JSON/TXT) :

```bash
npm run reset
```

## Structure du projet

```
pdf-parser/
├── rof-signup.js          Extraction, validation et export des PDFs
├── reset.js               Réinitialisation du projet
├── server.js              API locale pour l'extension Chrome (port 3001)
├── simulator.js           Simulateur du site Oval-e (port 3002)
├── package.json
├── README.md
├── converted/             PDFs traités avec succès, JSONs et rapports générés
├── errored/               PDFs rejetés + rapports d'erreurs
├── misc/
│   └── Fichier xls.xlsx   Fichier Excel mis à jour à chaque extraction
└── ChromeExtension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js            Logique de l'extension (liste, soumission, pause)
    └── content.js          Remplissage et soumission du formulaire Oval-e
```

## Scripts npm disponibles

| Commande | Description |
|----------|-------------|
| `npm run run` | Extraction et validation des PDFs |
| `npm run reset` | Réinitialisation (redéplace PDFs, supprime JSONs) |
| `npm run server` | Démarre le serveur API (port 3001) |
| `npm run sim` | Démarre le simulateur Oval-e (port 3002) |

## Exemple de données extraites

```json
{
  "Nom": "DUPONT",
  "Prénom": "Jean-Jacques",
  "Date de naissance": "01/01/2001",
  "Sexe": "M",
  "Adresse mail": "jean.dupont@example.com",
  "Ville de naissance": "Amiens",
  "Code postal naissance": "80000",
  "Téléphone fixe": "03 22 00 00 00",
  "Smartphone perso": "06 12 34 56 78"
}
```

## Dépannage

**Le fichier PDF n'est pas déplacé automatiquement**
→ Normal sous Windows si un processus verrouille le fichier (lecteur PDF ouvert).
  Le JSON est quand même créé.

**Erreur "EBUSY: resource busy"**
→ Fermez tous les lecteurs PDF et réessayez.

**Je veux recommencer le traitement**
→ Lancez `npm run reset` pour remettre tous les PDFs à la racine et supprimer les fichiers générés.

**L'extension ne trouve pas le serveur**
→ Vérifiez que `npm run server` est bien lancé et que l'onglet `localhost:3002` est ouvert dans Chrome.
