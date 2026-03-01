import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import XLSX from 'xlsx';

const __dirname = "./";
const outDir = path.resolve(__dirname, 'converted');
const errorDir = path.resolve(__dirname, 'errored');
const conversionErrors = [];

const REQUIRED_FIELDS = ['Nom', 'Prénom', 'Date de naissance', 'Sexe', 'Adresse mail', 'Ville de naissance'];

// Regex RFC 5322 — structure intentionnellement conservée, toute modification risque de casser la validation
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/;

// Chaque entrée associe un champ à sa regex de validation et au message d'erreur attendu
const FORMAT_VALIDATIONS = [
  {
    field: 'Adresse mail',
    regex: EMAIL_REGEX,
    errorMessage: 'Adresse mail (format invalide)',
  },
  {
    field: 'Code postal naissance',
    regex: /^\d{2}\s?\d{3}$/,
    errorMessage: 'Code postal naissance (format attendu : 5 chiffres, ex: 80000 ou 80 000)',
  },
];

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

  console.log(`Traitement du fichier ${fileName}...`);
  
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
      } catch (e) {
        // Certaines apparences de champs peuvent être "flattend" ou invalides
        console.log(`Erreur sur ${fieldName}:`, e.message);
        value = null;
      }
      result[fieldName] = value ?? "";
    })

    normalizeData(result);
    checkData(result, fileName);

    //* Si pas d'erreur levée par checkData
    // Libérer la mémoire et attendre un peu avant de déplacer le fichier
    pdfBytes = null;
    await new Promise(resolve => setTimeout(resolve, 500));

    // Essayer de déplacer le fichier avec gestion d'erreur
    try {
      await fs.rename(pdfPath, path.join(outDir, fileName));
      console.log(`  📁 déplacé dans ./converted/\n`);
    } catch (error_) {
      console.log(`  🚨 Impossible de déplacer automatiquement (fichier verrouillé) : ${error_.message}\n`);
    }
    return result;

  } catch (err) {
    console.error('  🚨 Erreur lors de l\'extraction!\n  => ', err.message);

    // Libérer la mémoire et attendre avant de déplacer
    pdfBytes = null;
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await fs.rename(pdfPath, path.join('./errored', fileName));
      console.log(`  📁 Fichier déplacé dans ./errored/\n`);
    } catch (error_) {
      console.log(`🚨 Impossible de déplacer automatiquement (fichier verrouillé) : ${error_.message}\n`);
    }

  }
}

// Capitalize la première lettre de chaque partie séparée par un espace ou un tiret
function capitalizeName(str) {
  return str
    .trim()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\s*-\s*/g, '-')
    .replaceAll(/\s*'\s*/g, "'")
    .split(/(?=[-\s])/)
    .map(part => {
      const sep = part.match(/^[-\s]/) ? part[0] : '';
      const word = sep ? part.slice(1) : part;
      return sep + word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

// Normalise un numéro de téléphone en groupes de 2 chiffres (ex: 06 12 34 56 78)
// Gère le format international +33 et le format national 10 chiffres
function normalizePhone(raw) {
  if (raw.startsWith('+33')) {
    const digits = '0' + raw.slice(3).replaceAll(/\D/g, '');
    return digits.replaceAll(/(\d{2})(?=\d)/g, '$1 ');
  }
  const digits = raw.replaceAll(/\D/g, '');
  return digits.replaceAll(/(\d{2})(?=\d)/g, '$1 ');
}

// Normalise une date en DD/MM/YYYY
// Accepte DD/MM/YYYY, DD-MM-YYYY ou DDMMYYYY
function normalizeBirthDate(raw) {
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/) ||
                raw.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!match) return raw;
  const [, dd, mm, yyyy] = match;
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
}

function normalizeData(data) {
  normalizeNames(data);
  normalizeFirstNames(data);
  normalizeEmails(data);
  normalizePhones(data);
  if (data['Date de naissance']) {
    data['Date de naissance'] = normalizeBirthDate(data['Date de naissance'].trim());
  }
}

function normalizeNames(data) {
  for (const field of ['Nom', 'Nom_Mère', 'Nom_Père']) {
    if (data[field]) {
      data[field] = data[field]
        .trim()
        .replaceAll(/\s+/g, ' ')
        .replaceAll(/\s*-\s*/g, '-')
        .replaceAll(/\s*'\s*/g, "'")
        .toUpperCase();
    }
  }
}

function normalizeFirstNames(data) {
  for (const field of ['Prénom', 'Prénom_Mère', 'Prénom_Père']) {
    if (data[field]) {
      data[field] = capitalizeName(data[field]);
    }
  }
}

function normalizeEmails(data) {
  for (const field of ['Adresse mail', 'Adresse mail_Mère', 'Adresse mail_Père']) {
    if (data[field]) {
      data[field] = data[field].trim().toLowerCase();
    }
  }
}

function normalizePhones(data) {
  for (const field of ['Téléphone fixe', 'Smartphone perso', 'Smartphone_Mère', 'Smartphone_Père']) {
    if (data[field]) {
      data[field] = normalizePhone(data[field].trim());
    }
  }
}

const checkData = ((data, fileName) => {
  console.log('  Validation des données...');

  const errors = [...listMissingFields(data), ...listInvalidFormats(data)];

  if (errors.length > 0) {
    conversionErrors.push(buildErrorReport(data, fileName, errors));
    throw new Error(`Données invalides: ${errors.join(', ')}`);
  }

  console.log('  ✅ Validation réussie');
})

function listMissingFields(data) {
  return REQUIRED_FIELDS
    .filter(field => !data[field])
    .map(field => `${field} manquant`);
}

function listInvalidFormats(data) {
  return FORMAT_VALIDATIONS
    .filter(({ field }) => data[field]) // champ présent — sinon déjà signalé comme manquant
    .filter(({ field, regex }) => !regex.test(String(data[field]).trim()))
    .map(({ errorMessage }) => errorMessage);
}

function buildErrorReport(data, fileName, errors) {
  const contactFields = ['Téléphone fixe', 'Smartphone perso', 'Adresse mail', 'Smartphone_Mère', 'Adresse mail_Mère', 'Smartphone_Père', 'Adresse mail_Père'];

  const label = errors.length > 1 ? 'Données invalides' : 'Donnée invalide';
  const mappedErrors = errors.map(e => `- ${e}`).join('\n');
  let message = `${label}:\n${mappedErrors}`;

  const contactLines = contactFields
    .filter(field => data[field])
    .map(field => `- ${field} : ${data[field]}`);

  if (contactLines.length > 0) {
    message += `\nMoyens de contact :\n${contactLines.join('\n')}`;
  }

  return { fileName, message };
}

function cleanEmptyRows(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const headers = extractHeaders(worksheet, range);
  const rowsWithData = extractNonEmptyRows(worksheet, range);
  const newSheet = buildCleanSheet(headers, rowsWithData, range);

  if (rowsWithData.length < range.e.r) {
    console.log(`🧹 Suppression de ${range.e.r - rowsWithData.length} ligne(s) vide(s)`);
  }

  return newSheet;
}

function extractHeaders(worksheet, range) {
  const headers = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    headers.push(cell ? cell.v : '');
  }
  return headers;
}

function extractNonEmptyRows(worksheet, range) {
  const rows = [];
  for (let row = 1; row <= range.e.r; row++) {
    const rowData = extractRowData(worksheet, range, row);
    if (rowHasContent(rowData)) {
      rows.push(rowData);
    }
  }
  return rows;
}

function extractRowData(worksheet, range, row) {
  const rowData = {};
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
    rowData[col] = cell ? cell.v : '';
  }
  return rowData;
}

function rowHasContent(rowData) {
  return Object.values(rowData).some(value =>
    value && String(value).trim() && String(value).trim() !== ' '
  );
}

function buildCleanSheet(headers, rowsWithData, range) {
  const sheet = {};

  headers.forEach((header, col) => {
    sheet[XLSX.utils.encode_cell({ r: 0, c: col })] = { v: header, t: 's' };
  });

  rowsWithData.forEach((rowData, rowIdx) => {
    for (let col = range.s.c; col <= range.e.c; col++) {
      sheet[XLSX.utils.encode_cell({ r: rowIdx + 1, c: col })] = {
        v: rowData[col] || '',
        t: 's'
      };
    }
  });

  sheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rowsWithData.length, c: range.e.c }
  });

  return sheet;
}

/**
 * Ajoute les données au fichier Excel existant avec matching des colonnes
 */
async function addToExistingExcel(data, excelPath, sheetName) {
  try {
    const { workbook, worksheet, headers, lastRow, range } = loadWorksheet(excelPath, sheetName);
    writeDataRows(worksheet, data, headers, lastRow);
    updateSheetRange(worksheet, lastRow, data.length, range.e.c);
    XLSX.writeFile(workbook, excelPath);
    console.log(`✅ Fichier Excel mis à jour: ${path.basename(excelPath)} (${data.length} ligne(s) ajoutée(s))`);
  } catch (err) {
    console.error('🚨 Erreur lors de l\'ajout au fichier Excel:', err.message);
  }
}

// Normalise un nom de colonne pour le matching insensible à la casse et aux espaces
function normalizeHeader(header) {
  return (header || '')
    .replaceAll('\r\n', ' ')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Lit le fichier Excel, nettoie les lignes vides et retourne les infos nécessaires à l'écriture
function loadWorksheet(excelPath, sheetName) {
  const workbook = XLSX.readFile(excelPath);
  const worksheet = cleanEmptyRows(workbook.Sheets[sheetName]);
  workbook.Sheets[sheetName] = worksheet;
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const headers = extractHeaders(worksheet, range);
  const lastRow = range.e.r + 1;
  return { workbook, worksheet, headers, lastRow, range };
}

// Écrit chaque enregistrement dans la feuille en faisant correspondre les colonnes par nom
function writeDataRows(worksheet, data, headers, lastRow) {
  data.forEach((row, i) => {
    headers.forEach((header, colIndex) => {
      const value = findValueForHeader(row, normalizeHeader(header));
      const cellRef = XLSX.utils.encode_cell({ r: lastRow + i, c: colIndex });
      worksheet[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
    });
  });
}

// Cherche dans un enregistrement la valeur dont la clé correspond au header normalisé
function findValueForHeader(row, normalizedTarget) {
  for (const [jsonKey, jsonValue] of Object.entries(row)) {
    if (normalizeHeader(jsonKey) === normalizedTarget) return jsonValue || '';
  }
  return '';
}

// Met à jour la plage de la feuille après ajout de lignes
function updateSheetRange(worksheet, lastRow, dataLength, lastCol) {
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow + dataLength - 1, c: lastCol }
  });
}

/**
 * * Script principal
 */
const files = await getFileNames();

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
const jsonFileUrl = `file:///${path.resolve(outputName).replaceAll('\\', '/')}`;
const jsonLink = `\x1B]8;;${jsonFileUrl}\x1B\\${path.basename(outputName)}\x1B]8;;\x1B\\`;
console.log(`✅ Fichier JSON créé: 🔗 ${jsonLink}`);

//* Ajout des données au fichier Excel existant
const excelPath = path.resolve(__dirname, 'misc/Fichier xls.xlsx');
await addToExistingExcel(response, excelPath, 'Feuil1');

//* Génération du compte-rendu d'erreurs
let errorMessage = '';
for(let error of conversionErrors) {
  errorMessage += `▫️ Fichier ${error.fileName} :\n`;
  errorMessage += `${error.message}\n\n`;
}

const errorFileName = `errors_${dateStr}.txt`;
const errorOutputName = path.join(errorDir, errorFileName);
const errorFileUrl = `file:///${path.resolve(errorOutputName).replaceAll('\\', '/')}`;
const errorLink = `\x1B]8;;${errorFileUrl}\x1B\\${errorFileName}\x1B]8;;\x1B\\`;
console.log(`\n==========================================\n\n🚨 Rapport d'erreur : 🔗 ${errorLink}\n\n${errorMessage}\n`);
await fs.writeFile(errorOutputName, `Rapport d'erreurs :\n\n${errorMessage}`);
