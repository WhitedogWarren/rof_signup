// Correspondance clés JSON → champs du formulaire Oval-e
const FIELD_MAP = {
  'Nom':               { id: 'Nom',          type: 'text', also: 'NomUsage' },  // Nom mappé sur Nom et NomUsage
  'Prénom':            { id: 'Prenom',        type: 'text' },
  'Adresse mail':      { id: 'Email',         type: 'text', also: 'ConfirmEmail' },
  'Ville de naissance':{ id: 'VilleNaissance',type: 'text' },
  'Date de naissance': { id: 'DateNaissance', type: 'date' },
  'Sexe':              { id: 'RefSexeId',     type: 'select', map: { 'M': '1', 'F': '2' } },
  // Valeurs par défaut temporaires (voir todo.txt)
  '_default_nationalite':   { id: 'RefPaysNationaliteId',   type: 'fixed', value: '99100' }, // Française
  '_default_pays_naissance':{ id: 'RefPaysInseeNaissanceId',type: 'fixed', value: '100'   }, // France
};

function fillForm(record) {
  let filled = 0;

  for (const [jsonKey, fieldDef] of Object.entries(FIELD_MAP)) {

    // Champ à valeur fixe (défaut codé en dur)
    if (fieldDef.type === 'fixed') {
      const el = document.getElementById(fieldDef.id);
      if (el) {
        el.value = fieldDef.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      }
      continue;
    }

    const value = record[jsonKey];
    if (value === undefined || value === null || String(value).trim() === '') continue;

    const el = document.getElementById(fieldDef.id);
    if (!el) continue;

    let finalValue = String(value).trim();

    // Conversion de format pour la date : DD/MM/YYYY → YYYY-MM-DD
    if (fieldDef.type === 'date') {
      const parts = finalValue.split('/');
      if (parts.length === 3) {
        finalValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Mapping de valeur (ex: M → 1)
    if (fieldDef.map?.[finalValue] !== undefined) {
      finalValue = fieldDef.map[finalValue];
    }

    el.value = finalValue;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    filled++;

    // Champ à dupliquer (ex: NomUsage → Nom, Email → ConfirmEmail)
    if (fieldDef.also) {
      const alsoEl = document.getElementById(fieldDef.also);
      if (alsoEl) {
        alsoEl.value = finalValue;
        alsoEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  // Département déduit des 2 premiers chiffres du code postal de naissance
  const codePostal = String(record['Code postal naissance'] || '').replace(/\s/, '').trim();
  const dept = codePostal.substring(0, 2);
  const deptEl = document.getElementById('RefDepartementsInseeId');
  if (deptEl) {
    const option = Array.from(deptEl.options).find(o => o.value === dept || o.value.startsWith(dept));
    if (option) {
      deptEl.value = option.value;
      deptEl.dispatchEvent(new Event('change', { bubbles: true }));
      filled++;
    }
  }

  // Remonter en haut de la page pour que l'utilisateur voie le formulaire
  window.scrollTo({ top: 0, behavior: 'smooth' });

  return { filled };
}

// Écoute les messages envoyés par le popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'fill_form') {
    const result = fillForm(message.record);
    sendResponse({ success: true, ...result });
  }

  if (message.action === 'submit_form') {
    fillForm(message.record);

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
        } catch { /* */ }
        sendResponse({ success: res.ok, status: res.status, message: msg });
      })
      .catch(() => {
        sendResponse({ success: false, status: 0, message: 'Erreur réseau' });
      });

    return true; // Garder le canal ouvert pour la réponse async
  }
});
