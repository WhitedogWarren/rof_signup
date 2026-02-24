import { PDFDocument } from 'pdf-lib';
import { faker } from '@faker-js/faker/locale/fr';
import fs from 'fs/promises';
import path from 'path';

const TEMPLATE_PATH = './misc/sampleTest_ok.pdf';

// Codes postaux français réalistes
const CODES_POSTAUX = [
  '80000', '80100', '80200',  // Somme
  '62000', '62100', '62200',  // Pas-de-Calais
  '59000', '59100', '59200',  // Nord
  '60000', '60100', '60200',  // Oise
  '75001', '75008', '75016',  // Paris
  '69001', '69003', '69006',  // Rhône
];

const CATEGORIES = ['M-6','M-8','M-10','M-12','M-14','M-16','M-19','F-6','F-8','F-10','F-12','F-15','F-18'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fakeDate() {
  const d = faker.date.birthdate({ min: 5, max: 50, mode: 'age' });
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Génère un jeu de données valide complet
function validData() {
  const sexe = randomItem(['M', 'F']);
  return {
    'Nom':                faker.person.lastName().toUpperCase(),
    'Prénom':             faker.person.firstName(sexe === 'M' ? 'male' : 'female'),
    'Adresse mail':       faker.internet.email().toLowerCase(),
    'Téléphone fixe':     faker.phone.number('03 ## ## ## ##'),
    'Smartphone perso':   faker.phone.number('06 ## ## ## ##'),
    'Date de naissance':  fakeDate(),
    'Ville de naissance': faker.location.city(),
    'Code postal naissance': randomItem(CODES_POSTAUX),
    'Sexe':               sexe,
    'Catégorie':          randomItem(CATEGORIES),
    'Taille de maillot':  randomItem(['S', 'M', 'L', 'XL', 'XXL']),
    'Pointure':           String(faker.number.int({ min: 36, max: 46 })),
    'Taille de short':    randomItem(['S', 'M', 'L', 'XL']),
    'Adresse1':           faker.location.streetAddress(),
    'Adresse2':           '',
    'Adresse3':           '',
    'Nom_Mère':           '',
    'Prénom_Mère':        '',
    'Smartphone_Mère':    '',
    'Adresse mail_Mère':  '',
    'Nom_Père':           '',
    'Prénom_Père':        '',
    'Smartphone_Père':    '',
    'Adresse mail_Père':  '',
    'Adresse_Mère1':      '',
    'Adresse_Mère2':      '',
    'Adresse_Mère3':      '',
    'Adresse_Père1':      '',
    'Adresse_Père2':      '',
    'Adresse_Père3':      '',
  };
}

async function generatePdf(data, outputPath) {
  const templateBytes = await fs.readFile(TEMPLATE_PATH);
  const doc = await PDFDocument.load(templateBytes);
  const form = doc.getForm();

  for (const [fieldName, value] of Object.entries(data)) {
    try {
      const field = form.getField(fieldName);
      const type = field.constructor.name;
      if (type === 'PDFTextField') {
        field.setText(value ? String(value) : '');
      } else if (type === 'PDFDropdown') {
        if (value) field.select(String(value));
      }
    } catch {
      // Champ non trouvé dans le template, on ignore
    }
  }

  const pdfBytes = await doc.save();
  await fs.writeFile(outputPath, pdfBytes);
  console.log(`✅ Généré : ${path.basename(outputPath)}`);
}

// ── Définition des 8 PDFs ──────────────────────────────────────────────────

const pdfs = [

  // ── 4 formulaires valides ──
  {
    name: 'test1_ok.pdf',
    data: validData(),
  },
  {
    name: 'test2_ok.pdf',
    data: validData(),
  },
  {
    name: 'test3_ok.pdf',
    data: validData(),
  },
  {
    name: 'test4_ok.pdf',
    data: validData(),
  },

  // ── 4 formulaires invalides ──
  {
    name: 'test5_manque_nom.pdf',
    data: { ...validData(), 'Nom': '' },
  },
  {
    name: 'test6_email_invalide.pdf',
    data: { ...validData(), 'Adresse mail': 'pasunemail' },
  },
  {
    name: 'test7_code_postal_invalide.pdf',
    data: { ...validData(), 'Code postal naissance': '123' },
  },
  {
    name: 'test8_manque_ville_naissance.pdf',
    data: { ...validData(), 'Ville de naissance': '' },
  },

];

// ── Génération ─────────────────────────────────────────────────────────────

for (const pdf of pdfs) {
  await generatePdf(pdf.data, path.resolve('./', pdf.name));
}

console.log(`\n🎉 ${pdfs.length} PDFs générés dans le dossier racine du projet.`);
