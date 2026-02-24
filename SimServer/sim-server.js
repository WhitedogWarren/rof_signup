import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3002;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Mode de simulation (modifiable via l'interface)
let simMode = 'success'; // 'success' | 'random-error'

// Route pour changer le mode depuis l'interface
app.post('/_sim/mode', (req, res) => {
  simMode = req.body.mode === 'random-error' ? 'random-error' : 'success';
  res.json({ mode: simMode });
});

app.get('/_sim/mode', (req, res) => {
  res.json({ mode: simMode });
});

// Route principale : affiche le formulaire
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ovalie-sim.html'));
});

// Route de soumission du formulaire (simule /Affilies/DemandeAffiliation/Init)
app.post('/Affilies/DemandeAffiliation/Init', (req, res) => {
  const body = req.body;

  // Validation serveur des champs obligatoires (champs licence exclus)
  const requiredFields = ['Nom', 'NomUsage', 'Prenom', 'RefSexeId', 'RefPaysNationaliteId', 'DateNaissance', 'RefPaysInseeNaissanceId', 'RefDepartementsInseeId', 'Email', 'ConfirmEmail'];
  const missing = requiredFields.filter(f => !body[f] || body[f].trim() === '');

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Champs obligatoires manquants',
      fields: missing
    });
  }

  // Validation email
  if (body.Email !== body.ConfirmEmail) {
    return res.status(400).json({
      success: false,
      error: 'Les deux emails ne correspondent pas'
    });
  }

  // Simulation d'erreur aléatoire
  if (simMode === 'random-error' && Math.random() < 0.4) {
    const errors = [
      { code: 401, message: 'Non autorisé : session expirée' },
      { code: 403, message: 'Accès refusé : droits insuffisants' },
      { code: 500, message: 'Erreur interne du serveur' },
    ];
    const err = errors[Math.floor(Math.random() * errors.length)];
    console.log(`[SIM] ❌ Erreur simulée : ${err.code} - ${err.message}`);
    return res.status(err.code).json({ success: false, error: err.message });
  }

  // Succès
  console.log(`[SIM] ✅ Soumission acceptée pour : ${body.Prenom} ${body.Nom}`);
  return res.status(201).json({
    success: true,
    message: 'Demande d\'affiliation transmise avec succès.',
    data: {
      nom: body.Nom,
      prenom: body.Prenom,
      email: body.Email,
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur de simulation démarré sur http://localhost:${PORT}`);
  console.log(`   Mode actuel : succès garanti`);
  console.log(`   Changez le mode via la case à cocher dans l'interface.`);
});
