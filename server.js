import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3001;
const CONVERTED_DIR = path.resolve('./converted');

app.use(express.json());

// Autoriser les requêtes depuis l'extension Chrome
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// GET /files — liste les fichiers JSON dans ./converted/
app.get('/files', async (req, res) => {
  try {
    const files = (await fs.readdir(CONVERTED_DIR))
      .filter(f => f.endsWith('.json'));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /files/:name — retourne le contenu d'un fichier JSON
app.get('/files/:name', async (req, res) => {
  const filePath = path.join(CONVERTED_DIR, req.params.name);
  // Sécurité : s'assurer que le fichier est bien dans le dossier autorisé
  if (!filePath.startsWith(CONVERTED_DIR)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(404).json({ error: 'Fichier introuvable' });
  }
});

// PATCH /files/:name — réécrit le fichier avec les records restants (après pause)
app.patch('/files/:name', async (req, res) => {
  const filePath = path.join(CONVERTED_DIR, req.params.name);
  if (!filePath.startsWith(CONVERTED_DIR)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  try {
    await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /files/:name — supprime un fichier traité
app.delete('/files/:name', async (req, res) => {
  const filePath = path.join(CONVERTED_DIR, req.params.name);
  if (!filePath.startsWith(CONVERTED_DIR)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  try {
    await fs.unlink(filePath);
    res.json({ success: true, deleted: req.params.name });
  } catch (err) {
    res.status(404).json({ error: 'Fichier introuvable' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
