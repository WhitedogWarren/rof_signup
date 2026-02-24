import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = './';
const convertedDir = './converted';
const erroredDir = './errored';

async function reset() {
  console.log('\n🔄 Réinitialisation du projet...\n');

  try {
    let movedCount = 0;
    let deletedCount = 0;

    // 1. Déplacer les PDFs de ./converted vers la racine
    console.log('📁 Traitement du dossier ./converted/...');
    try {
      const convertedFiles = await fs.readdir(convertedDir);
      for (const file of convertedFiles) {
        if (file.endsWith('.pdf')) {
          const sourceFile = path.join(convertedDir, file);
          const destFile = path.join(rootDir, file);
          await fs.rename(sourceFile, destFile);
          console.log(`  ✅ ${file} déplacé vers la racine`);
          movedCount++;
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`  ❌ Erreur lors du traitement de ./converted/:`, err.message);
      }
    }

    // 2. Déplacer les PDFs de ./errored vers la racine
    console.log('\n📁 Traitement du dossier ./errored/...');
    try {
      const erroredFiles = await fs.readdir(erroredDir);
      for (const file of erroredFiles) {
        if (file.endsWith('.pdf')) {
          const sourceFile = path.join(erroredDir, file);
          const destFile = path.join(rootDir, file);
          await fs.rename(sourceFile, destFile);
          console.log(`  ✅ ${file} déplacé vers la racine`);
          movedCount++;
        }
        if (file.endsWith('.txt')) {
          console.log(`  🗑️  fichier erreur supprimé : ${file}`);
          await fs.rm(path.join(erroredDir, file));
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`  ❌ Erreur lors du traitement de ./errored/:`, err.message);
      }
    }

    // 3. Supprimer tous les fichiers .json de ./converted
    console.log('\n🗑️  Suppression des fichiers JSON...');
    try {
      const convertedFiles = await fs.readdir(convertedDir);
      for (const file of convertedFiles) {
        if (file.endsWith('.json') || file.endsWith('.txt')) {
          const filePath = path.join(convertedDir, file);
          await fs.unlink(filePath);
          console.log(`  ✅ ${file} supprimé`);
          deletedCount++;
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`  ❌ Erreur lors de la suppression des JSON:`, err.message);
      }
    }

    // Résumé
    console.log('\n✨ Résumé de la réinitialisation:');
    console.log(`  📦 ${movedCount} fichier(s) PDF déplacé(s) vers la racine`);
    console.log(`  🗑️  ${deletedCount} fichier(s) JSON supprimé(s)`);
    console.log('\n✅ Réinitialisation terminée!\n');

  } catch (err) {
    console.error('❌ Erreur lors de la réinitialisation:', err);
    process.exit(1);
  }
}

await reset();
