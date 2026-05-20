// ============================================================
// FRANCHISING FIFO — Google Apps Script Backend
// Incolla questo codice in: Extensions > Apps Script
// Poi pubblica come Web App (Anyone can access)
// ============================================================

const SHEET_ID = '1kYbBsdLJwvCQybPZZ3T-IQXe9b2qV3kzNo35jmJeJxU';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const params = e.parameter || {};
  const postData = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const action = params.action || postData.action;

  let result;
  try {
    switch (action) {
      case 'getFatture':     result = getFatture(ss);     break;
      case 'getPagamenti':   result = getPagamenti(ss);   break;
      case 'getClienti':     result = getClienti(ss);     break;
      case 'addFattura':     result = addFattura(ss, postData); break;
      case 'addPagamento':   result = addPagamento(ss, postData); break;
      case 'updateFattura':  result = updateFattura(ss, postData); break;
      case 'getAllData':      result = getAllData(ss);     break;
      default: result = { error: 'Azione non riconosciuta: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader ? addCorsHeaders(ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)) :
    ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function addCorsHeaders(output) {
  return output;
}

// ---- LETTURA ----

function getAllData(ss) {
  return {
    clienti: getClienti(ss),
    fatture: getFatture(ss),
    pagamenti: getPagamenti(ss)
  };
}

function getClienti(ss) {
  const sheet = ss.getSheetByName('Clienti') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).filter(r => r[0]).map(r => rowToObj(headers, r));
}

function getFatture(ss) {
  const sheet = findSheet(ss, ['Fatture FIFO', 'Fatture', 'FIFO']);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).filter(r => r[0]).map(r => {
    const obj = rowToObj(headers, r);
    return normalizeFattura(obj);
  });
}

function getPagamenti(ss) {
  const sheet = findSheet(ss, ['Pagamenti', 'Pagamento']);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).filter(r => r[0]).map(r => rowToObj(headers, r));
}

// ---- SCRITTURA ----

function addFattura(ss, data) {
  const sheet = findSheet(ss, ['Fatture FIFO', 'Fatture', 'FIFO']);
  if (!sheet) throw new Error('Foglio Fatture non trovato');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = buildRow(headers, {
    'N° Fattura': data.n,
    'Data Fattura': data.data,
    'ID Cliente': data.cid,
    'Ragione Sociale': data.ragioneSociale,
    'Totale (€)': data.tot,
    'Pagato (€)': data.pagato || 0,
    'Residuo (€)': data.residuo || data.tot,
    'Stato': data.stato,
    'Scad. 30gg FM': data.s30,
    'Scad. 60gg FM': data.s60,
  });
  sheet.appendRow(row);
  return { ok: true, inserted: data.n };
}

function addPagamento(ss, data) {
  const sheet = findSheet(ss, ['Pagamenti', 'Pagamento']);
  if (!sheet) throw new Error('Foglio Pagamenti non trovato');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = buildRow(headers, {
    'ID Pagamento': data.id,
    'Data Pagamento': data.data,
    'ID Cliente': data.cid,
    'Ragione Sociale': data.ragioneSociale,
    'Importo (€)': data.importo,
    'Modalità': data.modo,
    'Note': data.note || '',
  });
  sheet.appendRow(row);
  // Aggiorna i residui delle fatture (FIFO)
  applyFIFOonSheet(ss, data.cid, parseFloat(data.importo));
  return { ok: true, inserted: data.id };
}

function updateFattura(ss, data) {
  const sheet = findSheet(ss, ['Fatture FIFO', 'Fatture', 'FIFO']);
  if (!sheet) throw new Error('Foglio Fatture non trovato');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const nCol = headers.findIndex(h => String(h).includes('Fattura') || String(h).includes('N°'));
  for (let i = 1; i < values.length; i++) {
    if (values[i][nCol] === data.n) {
      const pagatoCol = headers.findIndex(h => String(h).includes('Pagato'));
      const residuoCol = headers.findIndex(h => String(h).includes('Residuo'));
      const statoCol = headers.findIndex(h => String(h).includes('Stato'));
      if (pagatoCol >= 0) sheet.getRange(i + 1, pagatoCol + 1).setValue(data.pagato);
      if (residuoCol >= 0) sheet.getRange(i + 1, residuoCol + 1).setValue(data.residuo);
      if (statoCol >= 0) sheet.getRange(i + 1, statoCol + 1).setValue(data.stato);
      return { ok: true, updated: data.n };
    }
  }
  return { ok: false, error: 'Fattura non trovata: ' + data.n };
}

function applyFIFOonSheet(ss, cid, importo) {
  const sheet = findSheet(ss, ['Fatture FIFO', 'Fatture', 'FIFO']);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const cidCol = headers.findIndex(h => String(h).includes('Cliente') && String(h).includes('ID'));
  const statoCol = headers.findIndex(h => String(h).includes('Stato'));
  const pagatoCol = headers.findIndex(h => String(h).includes('Pagato'));
  const residuoCol = headers.findIndex(h => String(h).includes('Residuo'));
  const dataCol = headers.findIndex(h => String(h).includes('Data'));
  if (cidCol < 0 || residuoCol < 0) return;

  // Trova righe del cliente con residuo > 0
  let aperte = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r[cidCol] === cid) {
      const stato = String(r[statoCol] || '');
      if (stato.includes('APERTA') || stato.includes('PARZIALE')) {
        aperte.push({ row: i + 1, residuo: parseFloat(r[residuoCol]) || 0, pagato: parseFloat(r[pagatoCol]) || 0, data: r[dataCol] });
      }
    }
  }
  // Ordina per data (FIFO)
  aperte.sort((a, b) => parseItalianDate(a.data) - parseItalianDate(b.data));

  let rimanente = importo;
  for (const f of aperte) {
    if (rimanente <= 0) break;
    const da = Math.min(rimanente, f.residuo);
    const nuovoPagato = parseFloat((f.pagato + da).toFixed(2));
    const nuovoResiduo = parseFloat((f.residuo - da).toFixed(2));
    const nuovoStato = nuovoResiduo <= 0.01 ? 'SALDATA' : 'PARZIALE';
    if (pagatoCol >= 0) sheet.getRange(f.row, pagatoCol + 1).setValue(nuovoPagato);
    sheet.getRange(f.row, residuoCol + 1).setValue(nuovoResiduo);
    if (statoCol >= 0) sheet.getRange(f.row, statoCol + 1).setValue(nuovoStato);
    rimanente = parseFloat((rimanente - da).toFixed(2));
  }
}

// ---- UTILITY ----

function findSheet(ss, names) {
  for (const name of names) {
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  // fallback: cerca per nome parziale
  for (const sheet of ss.getSheets()) {
    for (const name of names) {
      if (sheet.getName().toLowerCase().includes(name.toLowerCase())) return sheet;
    }
  }
  return null;
}

function rowToObj(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
}

function buildRow(headers, data) {
  return headers.map(h => data[h] !== undefined ? data[h] : '');
}

function normalizeFattura(obj) {
  const keys = Object.keys(obj);
  const get = (...candidates) => {
    for (const c of candidates) {
      const k = keys.find(k => k.includes(c));
      if (k !== undefined) return obj[k];
    }
    return '';
  };
  return {
    n: get('N°', 'Fattura'),
    data: formatDate(get('Data')),
    cid: get('ID Cliente', 'Cliente'),
    ragioneSociale: get('Ragione'),
    tot: parseFloat(get('Totale')) || 0,
    pagato: parseFloat(get('Pagato')) || 0,
    residuo: parseFloat(get('Residuo')) || 0,
    stato: cleanStato(String(get('Stato') || '')),
    s30: formatDate(get('30')),
    s60: formatDate(get('60')),
  };
}

function cleanStato(s) {
  if (s.includes('SALDATA') || s.includes('✅')) return 'SALDATA';
  if (s.includes('PARZIALE') || s.includes('⚠')) return 'PARZIALE';
  if (s.includes('CREDITO') || s.includes('🔵')) return 'CREDITO';
  if (s.includes('APERTA') || s.includes('🔴')) return 'APERTA';
  return s.trim();
}

function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  return String(d);
}

function parseItalianDate(s) {
  if (!s) return 0;
  if (s instanceof Date) return s.getTime();
  const parts = String(s).split('/');
  if (parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]).getTime();
  return 0;
}
