// Correspondance clés JSON → champs du formulaire Oval-e
const FIELD_MAP = {
  'Nom':               { id: 'Nom',          type: 'text', also: 'NomUsage' },  // Nom mappé sur Nom et NomUsage
  'Prénom':            { id: 'Prenom',        type: 'text' },
  'Adresse mail':      { id: 'Email',         type: 'text', also: 'ConfirmEmail' },
  'Ville de naissance':{ id: 'VilleNaissance',type: 'text' },
  'Date de naissance': { id: 'DateNaissance', type: 'date' },
  'Sexe':              { id: 'RefSexeId',     type: 'select', map: { 'M': '1', 'F': '2' } },
  // NOSONAR Valeurs par défaut temporaires (voir todo.txt)
  '_default_nationalite':   { id: 'RefPaysNationaliteId',   type: 'fixed', value: '99100' }, // Française
  '_default_pays_naissance':{ id: 'RefPaysInseeNaissanceId',type: 'fixed', value: '100'   }, // France
};

function fillForm(record) {
  let filled = 0;

  for (const [jsonKey, fieldDef] of Object.entries(FIELD_MAP)) {
    if (fieldDef.type === 'fixed') {
      filled += fillFixedField(fieldDef);
      continue;
    }
    filled += fillMappedField(fieldDef, record[jsonKey]);
  }

  filled += fillDepartement(record);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  return { filled };
}

// Remplit un champ avec une valeur fixe codée en dur (nationalité, pays de naissance, etc.)
function fillFixedField(fieldDef) {
  const el = document.getElementById(fieldDef.id);
  if (!el) return 0;
  el.value = fieldDef.value;
  dispatchFieldEvents(el, ['change']);
  return 1;
}

// Remplit un champ texte, date ou select depuis les données du record
function fillMappedField(fieldDef, value) {
  if (value === undefined || value === null || String(value).trim() === '') return 0;

  const el = document.getElementById(fieldDef.id);
  if (!el) return 0;

  let finalValue = String(value).trim();
  if (fieldDef.type === 'date') finalValue = convertDateFormat(finalValue);
  if (fieldDef.map) finalValue = applyValueMap(finalValue, fieldDef.map);

  el.value = finalValue;
  dispatchFieldEvents(el, ['change', 'input']);

  // Champ à dupliquer (ex: Email → ConfirmEmail)
  if (fieldDef.also) fillMirrorField(fieldDef.also, finalValue);

  return 1;
}

// Copie une valeur dans un champ miroir (confirmation)
function fillMirrorField(fieldId, value) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.value = value;
  dispatchFieldEvents(el, ['change']);
}

// Convertit DD/MM/YYYY en YYYY-MM-DD (format attendu par les inputs date HTML)
function convertDateFormat(value) {
  const parts = value.split('/');
  if (parts.length !== 3) return value;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// Applique un mapping de valeur si la clé existe (ex: 'M' → '1')
function applyValueMap(value, map) {
  return Object.hasOwn(map, value) ? map[value] : value;
}

// Déduit le département des 2 premiers chiffres du code postal de naissance
function fillDepartement(record) {
  const codePostal = String(record['Code postal naissance'] || '').replace(/\s/, '').trim();
  const dept = codePostal.substring(0, 2);
  const deptEl = document.getElementById('RefDepartementsInseeId');
  if (!deptEl) return 0;

  const option = Array.from(deptEl.options).find(o => o.value === dept || o.value.startsWith(dept));
  if (!option) return 0;

  deptEl.value = option.value;
  dispatchFieldEvents(deptEl, ['change']);
  return 1;
}

// Dispatche une liste d'événements sur un élément du DOM
function dispatchFieldEvents(el, events) {
  for (const eventName of events) {
    el.dispatchEvent(new Event(eventName, { bubbles: true }));
  }
}

// Soumet le formulaire via fetch et renvoie le résultat au popup
function submitForm(record, sendResponse) {
  fillForm(record);

  const form = document.querySelector('form');
  const formData = new URLSearchParams(new FormData(form)).toString();

  fetch('/Affilies/DemandeAffiliation/Init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  })
    .then(async (res) => {
      let msg = '';
      try {
        const json = await res.json();
        msg = json.message || json.error || '';
      } catch (error_) { // NOSONAR — message générique intentionnel : la réponse n'est pas forcément du JSON
      }
      sendResponse({ success: res.ok, status: res.status, message: msg });
    })
    .catch(() => {
      sendResponse({ success: false, status: 0, message: 'Erreur réseau' });
    });
}

// Écoute les messages envoyés par le popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'fill_form') {
    const result = fillForm(message.record);
    sendResponse({ success: true, ...result });
  }

  if (message.action === 'submit_form') {
    submitForm(message.record, sendResponse);
    return true; // Garder le canal ouvert pour la réponse async
  }
});
