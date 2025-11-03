import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import XLSX from 'xlsx';

const __dirname = "./";
const outDir = path.resolve(__dirname, 'converted');
const conversionErrors = [];

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
  
  const pdfPath = path.resolve(__dirname, fileName);
  

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

    checkData(result, fileName);

    //* Si pas d'erreur levée par checkData
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
    return result;
    
  } catch (err) {
    console.error('🚨 Erreur lors de l\'extraction avec pdf-lib !\n=> ', err.message);

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

const checkData = ((data, fileName) => {
  console.log('Validation des données...');

  const errors = [];

  if(!data['Nom']) {
    errors.push('Nom');
  }
  if(!data['Prénom']) {
    errors.push('Prénom');
  }
  if(!data['Date de naissance']) {
    errors.push('Date de naissance');
  }

  if (errors.length > 0) {
    //TODO écrire un compte rendu
    const error = {
      fileName,
      message: `Données invalides: ${errors.join(', ')} manquant${errors >1 ? s : ''}`
    }
    conversionErrors.push(error);

    throw new Error(`Données invalides: ${errors.join(', ')} manquant${errors >1 ? s : ''}`);
  }

  console.log('✅ Validation réussie');
})

/**
 * Nettoie les lignes vides du fichier Excel
 */
function cleanEmptyRows(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Récupérer tous les en-têtes (ligne 0)
  const excelHeaders = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellRef];
    excelHeaders.push(cell ? cell.v : '');
  }

  // Récupérer toutes les lignes avec contenu
  const rowsWithData = [];
  for (let row = 1; row <= range.e.r; row++) {
    let hasData = false;
    const rowData = {};

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellRef];
      const value = cell ? cell.v : '';

      if (value && String(value).trim() && String(value).trim() !== ' ') {
        hasData = true;
      }
      rowData[col] = value;
    }

    if (hasData) {
      rowsWithData.push(rowData);
    }
  }

  // Créer une nouvelle feuille propre
  const newSheet = {};

  // Ajouter les en-têtes
  excelHeaders.forEach((header, col) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    newSheet[cellRef] = { v: header, t: 's' };
  });

  // Ajouter les lignes avec contenu
  rowsWithData.forEach((rowData, rowIdx) => {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: col });
      const value = rowData[col];
      newSheet[cellRef] = {
        v: value || '',
        t: 's'
      };
    }
  });

  // Définir la nouvelle plage
  newSheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rowsWithData.length, c: range.e.c }
  });

  if (rowsWithData.length < range.e.r) {
    console.log(`🧹 Suppression de ${range.e.r - rowsWithData.length} ligne(s) vide(s)`);
  }

  return newSheet;
}

/**
 * Ajoute les données au fichier Excel existant avec matching des colonnes
 */
async function addToExistingExcel(data, excelPath, sheetName) {
  try {
    // Lire le fichier Excel existant
    const workbook = XLSX.readFile(excelPath);
    let worksheet = workbook.Sheets[sheetName];

    // Nettoyer les lignes vides
    worksheet = cleanEmptyRows(worksheet);
    workbook.Sheets[sheetName] = worksheet;

    // Récupérer la plage et extraire les en-têtes directement des cellules
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const excelHeaders = [];

    // Lire les en-têtes depuis la première ligne
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellRef];
      excelHeaders.push(cell ? cell.v : '');
    }

    const lastRow = range.e.r + 1; // Dernière ligne + 1

    // Fonction pour normaliser les noms de colonnes
    const normalizeHeader = (header) => {
      return (header || '')
        .replace(/\r\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    };

    // Ajouter chaque ligne de données
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = lastRow + i;

      // Pour chaque colonne Excel, trouver la valeur correspondante
      for (let colIndex = 0; colIndex < excelHeaders.length; colIndex++) {
        const excelHeader = excelHeaders[colIndex];
        const normalizedExcelHeader = normalizeHeader(excelHeader);
        let value = '';

        // Chercher une clé correspondante dans les données JSON
        for (const [jsonKey, jsonValue] of Object.entries(row)) {
          if (normalizeHeader(jsonKey) === normalizedExcelHeader) {
            value = jsonValue || '';
            break;
          }
        }

        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        worksheet[cellRef] = {
          v: value,
          t: typeof value === 'number' ? 'n' : 's'
        };
      }
    }

    // Mettre à jour la plage
    const newRange = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow + data.length - 1, c: range.e.c }
    });
    worksheet['!ref'] = newRange;

    // Sauvegarder le fichier
    XLSX.writeFile(workbook, excelPath);
    console.log(`✅ Fichier Excel mis à jour: ${path.basename(excelPath)} (${data.length} ligne(s) ajoutée(s))`);
  } catch (err) {
    console.error('🚨 Erreur lors de l\'ajout au fichier Excel:', err.message);
  }
}

/**
 * * Script principal
 */
const files = await getFileNames();

console.log('\n\nFichiers trouvés : ', files);
const response = [];
for (const file of files) {
  let result = await extractFormFields(file);
  if(result) {
    response.push(result);
  }
  
}
const dateStr = `${new Date().getFullYear().toString().substring(2)}-${new Date().getMonth().toString()}-${new Date().getDate().toString()}`;

const outputName = path.join(outDir, `result_${dateStr}.json`);

await fs.writeFile(outputName, JSON.stringify(response, null, 2));
console.log(`✅ Fichier JSON créé: ${path.basename(outputName)}`);

//* Ajout des données au fichier Excel existant
const excelPath = path.resolve(__dirname, 'misc/Fichier xls.xlsx');
await addToExistingExcel(response, excelPath, 'Feuil1');

//* Génération du compte-rendu d'erreurs
let errorMessage = '';
for(let error of conversionErrors) {
  errorMessage += `▫️ Fichier ${error.fileName} :\n`;
  errorMessage += `${error.message}\n\n`;
}

console.log(`\n==========================================\n\n🚨 Rapport d'erreur :\n\n${errorMessage}`);
const errorOutputName = path.join(outDir, `errors_${dateStr}.txt`);
await fs.writeFile(errorOutputName, `Rapport d'erreurs :\n\n${errorMessage}`);

//* Création du csv

