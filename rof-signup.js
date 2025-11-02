import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

// Désactiver les warnings de pdfjs
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('standardFontDataUrl') || args[0]?.includes?.('Indexing') || args[0]?.includes?.('readXRef')) {
    return; // Ignorer ces warnings
  }
  originalWarn(...args);
};

async function getFileNames() {
  const files = (await fs.readdir('./')).filter(file => file.endsWith('.pdf'));
  return files;
}

async function extractFormFields(fileName) {
  const __dirname = "./"
  const pdfPath = path.resolve(__dirname, fileName);
  const outDir = path.resolve(__dirname, 'converted');

  let pdfBytes;

  try {

    pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Récupère le formulaire (AcroForm) s'il existe
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const result = {};
    fields.forEach((field) => {
      const type = field.constructor.name;
      const fieldName = field.getName();
      let value = null;
      try {
        // Les méthodes varient selon le type de champ
        if (type === 'PDFTextField') {
          value = field.getText();

          // Nettoyer les valeurs "undefined" littérales
          if (value === 'undefined' || value === undefined || value === null) {
            value = '';
          }
        }
        else if (type === 'PDFCheckBox') {
          value = field.isChecked();
        }
        else if (type === 'PDFRadioGroup') {
          value = field.getSelected();
        }
        else if (type === 'PDFDropdown' || type === 'PDFOptionList') {
          value = field.getSelected()[0];
        }
        else {
          value = null;
        }
      } catch (e) {
        // Certaines apparences de champs peuvent être "flattend" ou invalides
        console.log(`Erreur sur ${fieldName}:`, e.message);
        value = null;
      }
      result[fieldName] = value ?? "";
    })

    // Injecter la date extraite dans le champ Date3_af_date s'il est vide
    if ((!result['Date3_af_date'] || result['Date3_af_date'] === '') && extractedDate) {
      result['Date3_af_date'] = extractedDate;
      console.log(`✅ Date injectée dans Date3_af_date: ${extractedDate}`);
    }
    if (result['Date3_af_date']) {
      console.log(`📆 date trouvée`);
    }

    checkData(result);

    //* Si pas d'erreur levée par checkData
    // Nom du fichier de sortie (avec ou sans date)
    const dateStr = result['Date3_af_date'] ? `_${result['Date3_af_date'].replace(/\//g, '-')}` : '';
    const outputName = path.join(outDir, `${result['Nom']}_${result['Prénom']}${dateStr}.json`);

    await fs.writeFile(outputName, JSON.stringify(result, null, 2));
    console.log(`✅ Fichier JSON créé: ${path.basename(outputName)}`);

    // Libérer la mémoire et attendre un peu avant de déplacer le fichier
    pdfBytes = null;
    await new Promise(resolve => setTimeout(resolve, 500));

    // Essayer de déplacer le fichier avec gestion d'erreur
    try {
      await fs.rename(pdfPath, path.join(outDir, fileName));
      console.log(`📁 déplacé dans ./converted/\n`);
    } catch (renameErr) {
      console.log(`🚨 Impossible de déplacer automatiquement (fichier verrouillé)\n`);
    }

    
  } catch (err) {
    console.error('🚨 Erreur lors de l\'extraction avec pdf-lib :', err);

    // Libérer la mémoire et attendre avant de déplacer
    pdfBytes = null;
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await fs.rename(pdfPath, path.join('./errored', fileName));
      console.log(`📁 Fichier déplacé dans ./errored/\n`);
    } catch (renameErr) {
      console.log(`🚨 Impossible de déplacer automatiquement (fichier verrouillé)\n`);
    }

  }
}

const checkData = (data => {
  console.log('Validation des données...');

  const errors = [];

  if(!data['Nom']) {
    console.log('⚠️  Nom manquant');
    errors.push('Nom');
  }
  if(!data['Prénom']) {
    console.log('⚠️  Prénom manquant');
    errors.push('Prénom');
  }
  if(!data['Date3_af_date']) {
    console.log('⚠️  Date de naissance manquante (le PDF doit être sauvegardé avec Adobe Reader)');
    errors.push('Date3_af_date');
  }

  if (errors.length > 0) {
    throw new Error(`Données invalides: ${errors.join(', ')} manquant(s)`);
  }

  console.log('✅ Validation réussie\n');
})

/**
 * * Script principal
 */
const files = await getFileNames();

console.log('\n\nFichiers trouvés : ', files);

for (const file of files) {
  await extractFormFields(file);
}
