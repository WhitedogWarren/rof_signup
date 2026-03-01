import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = './';
const convertedDir = './converted';
const erroredDir = './errored';

async function reset() {
  console.log('\n🔄 Réinitialisation du projet...\n');

  try {
    const movedFromConverted = await movePdfsToRoot(convertedDir);
    const movedFromErrored = await movePdfsToRoot(erroredDir);
    await deleteReportFiles(erroredDir);
    const deletedCount = await deleteOutputFiles(convertedDir);

    printSummary(movedFromConverted + movedFromErrored, deletedCount);
  } catch (err) {
    console.error('❌ Erreur lors de la réinitialisation:', err);
    process.exit(1);
  }
}

// Déplace tous les PDFs d'un dossier vers la racine du projet
async function movePdfsToRoot(sourceDir) {
  console.log(`\n📁 Traitement du dossier ${sourceDir}/...`);
  let movedCount = 0;
  try {
    const files = await fs.readdir(sourceDir);
    for (const file of files.filter(f => f.endsWith('.pdf'))) {
      await fs.rename(path.join(sourceDir, file), path.join(rootDir, file));
      console.log(`  ✅ ${file} déplacé vers la racine`);
      movedCount++;
    }
  } catch (err) {
    handleDirError(err, sourceDir);
  }
  return movedCount;
}

// Supprime les fichiers .txt (rapports d'erreurs) d'un dossier
async function deleteReportFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    for (const file of files.filter(f => f.endsWith('.txt'))) {
      await fs.rm(path.join(dir, file));
      console.log(`  🗑️  fichier erreur supprimé : ${file}`);
    }
  } catch (err) {
    handleDirError(err, dir);
  }
}

// Supprime les fichiers de sortie (.json, .txt) du dossier converted
async function deleteOutputFiles(dir) {
  console.log('\n🗑️  Suppression des fichiers JSON...');
  let deletedCount = 0;
  try {
    const files = await fs.readdir(dir);
    for (const file of files.filter(f => f.endsWith('.json') || f.endsWith('.txt'))) {
      await fs.unlink(path.join(dir, file));
      console.log(`  ✅ ${file} supprimé`);
      deletedCount++;
    }
  } catch (err) {
    handleDirError(err, dir);
  }
  return deletedCount;
}

// Ignore les erreurs "dossier absent" — les autres sont remontées
function handleDirError(err, dir) {
  if (err.code !== 'ENOENT') {
    console.error(`  ❌ Erreur lors du traitement de ${dir}:`, err.message);
  }
}

function printSummary(movedCount, deletedCount) {
  console.log('\n✨ Résumé de la réinitialisation:');
  console.log(`  📦 ${movedCount} fichier(s) PDF déplacé(s) vers la racine`);
  console.log(`  🗑️  ${deletedCount} fichier(s) JSON supprimé(s)`);
  console.log('\n✅ Réinitialisation terminée!\n');
}

await reset();
