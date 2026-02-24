const API     = 'http://localhost:3001';
const SIM_URL = 'http://localhost:3002';

const statusEl      = document.getElementById('status');
const fileListEl    = document.getElementById('file-list');
const btnRefresh    = document.getElementById('btn-refresh');
const btnProcessAll = document.getElementById('btn-process-all');
const btnPause      = document.getElementById('btn-pause');

btnRefresh.addEventListener('click', loadFiles);

// Suivi des items par fichier : { fileName -> { total, treated: Set, records: [] } }
const treatedMap = new Map();

let isProcessing   = false;
let pauseRequested = false;

// ── Cherche un onglet ouvert sur localhost:3002 ──
async function findSimTab() {
  const tabs = await chrome.tabs.query({ url: `${SIM_URL}/*` });
  return tabs.length > 0 ? tabs[0] : null;
}

async function loadFiles() {
  statusEl.textContent = 'Chargement...';
  fileListEl.innerHTML = '';
  treatedMap.clear();

  try {
    const res = await fetch(`${API}/files`);
    if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);

    const files = await res.json();

    if (files.length === 0) {
      statusEl.textContent = '';
      fileListEl.innerHTML = '<div id="empty-msg">Aucun fichier à traiter.</div>';
      return;
    }

    let totalPersons = 0;
    for (const fileName of files) {
      try {
        const dataRes = await fetch(`${API}/files/${encodeURIComponent(fileName)}`);
        const data = await dataRes.json();
        const records = Array.isArray(data) ? data : [data];

        treatedMap.set(fileName, { total: records.length, treated: new Set(), records });

        records.forEach((record, index) => {
          renderPersonItem(fileName, record, index);
          totalPersons++;
        });
      } catch {
        statusEl.textContent = `⚠️ Erreur lors du chargement de ${fileName}`;
      }
    }

    statusEl.textContent = `${totalPersons} personne(s) à traiter`;

  } catch {
    statusEl.textContent = '';
    fileListEl.innerHTML = `<div id="empty-msg">⚠️ Impossible de joindre le serveur.<br><small>Vérifiez que <code>npm run server</code> est lancé.</small></div>`;
  }
}

function renderPersonItem(fileName, record, index) {
  const nom    = record['Nom']    || '';
  const prenom = record['Prénom'] || '';
  const label  = (nom || prenom) ? `${prenom} ${nom}`.trim() : `Entrée ${index + 1}`;

  const item = document.createElement('div');
  item.className = 'file-item';
  item.dataset.fileName = fileName;
  item.dataset.index    = index;
  item.dataset.record   = JSON.stringify(record);

  item.innerHTML = `
    <div class="file-header">
      <span class="file-name">👤 ${label}</span>
      <div class="file-actions">
        <button class="btn-submit">Soumettre</button>
        <button class="btn-toggle">Voir</button>
      </div>
    </div>
    <div class="file-content"></div>
  `;

  const btnSubmit = item.querySelector('.btn-submit');
  const btnToggle = item.querySelector('.btn-toggle');
  const contentEl = item.querySelector('.file-content');

  btnSubmit.addEventListener('click', () => submitItem(fileName, record, index, item));

  btnToggle.addEventListener('click', () => {
    const isOpen = contentEl.classList.contains('open');
    if (isOpen) {
      contentEl.classList.remove('open');
      btnToggle.textContent = 'Voir';
    } else {
      if (!contentEl.dataset.loaded) {
        contentEl.innerHTML = renderRecord(record);
        contentEl.dataset.loaded = '1';
      }
      contentEl.classList.add('open');
      btnToggle.textContent = 'Masquer';
    }
  });

  fileListEl.appendChild(item);
}

// ── Soumettre un item et gérer la réponse ──
async function submitItem(fileName, record, index, itemEl) {
  const btnSubmit = itemEl.querySelector('.btn-submit, .btn-retry');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = '...';
  }

  // Retirer l'état d'erreur précédent
  itemEl.classList.remove('item-error');
  const oldMsg = itemEl.querySelector('.item-error-msg');
  if (oldMsg) oldMsg.remove();
  const oldRetry = itemEl.querySelector('.btn-retry');
  if (oldRetry) oldRetry.remove();

  const tab = await findSimTab();
  if (!tab) {
    statusEl.textContent = `⚠️ Ouvrez d'abord ${SIM_URL} dans Chrome.`;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Soumettre';
    }
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).catch(() => {});

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'submit_form',
      record
    });

    if (response?.success) {
      // ── Succès (200/201) ──
      const fileState = treatedMap.get(fileName);
      fileState.treated.add(index);
      itemEl.classList.add('treated');
      itemEl.style.opacity = '0.4';
      itemEl.style.borderLeft = '3px solid #2e7d32';

      if (fileState.treated.size === fileState.total) {
        await fetch(`${API}/files/${encodeURIComponent(fileName)}`, { method: 'DELETE' }).catch(() => {});
      } else {
        const remaining = fileState.records.filter((_, i) => !fileState.treated.has(i));
        await fetch(`${API}/files/${encodeURIComponent(fileName)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(remaining),
        }).catch(() => {});
      }

      setTimeout(() => {
        itemEl.remove();
        updateCounter();
      }, 600);

      updateCounter();
      return true;

    } else {
      setItemError(itemEl, fileName, record, index, response?.status, response?.message);
      return false;
    }

  } catch {
    setItemError(itemEl, fileName, record, index, 0, 'Erreur réseau — vérifiez que le site est ouvert.');
    return false;
  }
}

function setItemError(itemEl, fileName, record, index, status, message) {
  itemEl.classList.add('item-error');

  const actionsEl = itemEl.querySelector('.file-actions');

  const oldBtn = actionsEl.querySelector('.btn-submit, .btn-retry');
  if (oldBtn) oldBtn.remove();

  const btnRetry = document.createElement('button');
  btnRetry.className = 'btn-retry';
  btnRetry.textContent = '↺ Réessayer';
  btnRetry.addEventListener('click', () => submitItem(fileName, record, index, itemEl));
  actionsEl.prepend(btnRetry);

  const msgEl = document.createElement('div');
  msgEl.className = 'item-error-msg';
  msgEl.textContent = status
    ? `Erreur HTTP ${status}${message ? ' — ' + message : ''}`
    : (message || 'Erreur inconnue');
  itemEl.querySelector('.file-header').after(msgEl);
}

function updateCounter() {
  const remaining = fileListEl.querySelectorAll('.file-item:not(.treated)').length;
  if (remaining === 0 && fileListEl.querySelectorAll('.file-item').length === 0) {
    statusEl.textContent = '';
    fileListEl.innerHTML = '<div id="empty-msg">Aucun fichier à traiter.</div>';
  } else {
    statusEl.textContent = `${remaining} personne(s) restante(s)`;
  }
}

// ── Bouton "Tout traiter" ──
btnProcessAll.addEventListener('click', async () => {
  isProcessing   = true;
  pauseRequested = false;
  btnProcessAll.style.display = 'none';
  btnPause.style.display      = '';
  btnPause.disabled           = false;
  btnRefresh.disabled         = true;

  const items = [...fileListEl.querySelectorAll('.file-item:not(.treated)')];

  for (const itemEl of items) {
    if (pauseRequested) break;

    const { fileName, index } = itemEl.dataset;
    const record = JSON.parse(itemEl.dataset.record);

    await submitItem(fileName, record, Number(index), itemEl);

    if (!pauseRequested) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // Si pause demandée : PATCH les fichiers partiellement traités
  if (pauseRequested) {
    for (const [fileName, fileState] of treatedMap.entries()) {
      if (fileState.treated.size > 0 && fileState.treated.size < fileState.total) {
        const remaining = fileState.records.filter((_, i) => !fileState.treated.has(i));
        await fetch(`${API}/files/${encodeURIComponent(fileName)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(remaining),
        }).catch(() => {});
      }
    }
    const nb = fileListEl.querySelectorAll('.file-item:not(.treated)').length;
    statusEl.textContent = `⏸ Suspendu — ${nb} personne(s) restante(s)`;
  }

  isProcessing   = false;
  pauseRequested = false;
  btnProcessAll.style.display = '';
  btnPause.style.display      = 'none';
  btnRefresh.disabled         = false;
});

// ── Bouton "Pause" ──
btnPause.addEventListener('click', () => {
  pauseRequested    = true;
  btnPause.disabled = true;
  statusEl.textContent = '⏸ Pause en cours...';
});

function renderRecord(record) {
  const fields = Object.entries(record)
    .filter(([, v]) => v !== '' && v !== null && v !== false && String(v).trim() !== '')
    .map(([k, v]) => `<div class="record-field"><span>${k} :</span><strong>${v}</strong></div>`)
    .join('');
  return `<div class="record">${fields || '<em>Aucune donnée</em>'}</div>`;
}

// Chargement initial
loadFiles();
