# Franchising FIFO — Installazione PWA + Google Sheets

## Cosa hai scaricato

| File | Descrizione |
|------|-------------|
| `index.html` | L'app vera e propria (PWA) |
| `manifest.json` | Rende l'app installabile su iPhone/Android |
| `sw.js` | Service Worker — permette uso offline |
| `Code.gs` | Script da incollare in Google Apps Script |

---

## PASSO 1 — Pubblica su GitHub Pages (gratis, 5 minuti)

1. Vai su **github.com** e crea un account gratuito se non ce l'hai
2. Crea un nuovo repository → clicca **"New"**
3. Chiama il repository `franchising-fifo`
4. Spunta **"Add a README file"** → clicca **Create repository**
5. Clicca **"uploading an existing file"**
6. Trascina i 4 file: `index.html`, `manifest.json`, `sw.js`, `Code.gs`
7. Clicca **Commit changes**
8. Vai su **Settings → Pages**
9. In "Branch" seleziona `main` e clicca **Save**
10. Dopo 1-2 minuti l'app sarà disponibile su:
    `https://TUO-NOME.github.io/franchising-fifo`

---

## PASSO 2 — Collega Google Sheets (sync bidirezionale)

1. Apri il tuo Google Sheets (Gestione Franchising FIFO)
2. Vai su **Estensioni → Apps Script**
3. Cancella tutto il contenuto nell'editor
4. Apri il file `Code.gs` e copia tutto il testo
5. Incollalo nell'editor di Apps Script
6. Clicca **Salva** (icona floppy disk)
7. Clicca **Distribuisci → Nuova distribuzione**
8. Clicca l'ingranaggio ⚙️ e scegli **App web**
9. Imposta:
   - Descrizione: `FIFO API`
   - Esegui come: **Me**
   - Chi può accedere: **Chiunque**
10. Clicca **Distribuisci** → autorizza quando richiesto
11. **Copia l'URL** che appare (inizia con `https://script.google.com/macros/s/...`)

---

## PASSO 3 — Installa su iPhone

1. Apri **Safari** (non Chrome — deve essere Safari)
2. Vai all'URL GitHub Pages del passo 1
3. L'app ti chiederà l'URL dello script → incolla quello del passo 2
4. Clicca **Connetti e sincronizza**
5. Tocca il pulsante **Condividi** (quadrato con freccia su)
6. Scorri e tocca **"Aggiungi alla schermata Home"**
7. Dai un nome (es. "FIFO") → tocca **Aggiungi**

L'app appare ora come un'icona sulla tua home. Si apre senza barra URL, come un'app vera.

---

## Funzionalità

- **Dashboard** — overview saldi, fatturato totale, da incassare
- **Clienti** — ricerca, dettaglio per cliente con storico completo
- **Fatture** — filtri per stato, aggiunta nuove fatture
- **Pagamenti** — registro con distribuzione automatica FIFO
- **Sync** — sincronizzazione bidirezionale con Google Sheets
- **Offline** — funziona senza connessione, sincronizza quando torna internet

---

## Come funziona la sync FIFO

Quando aggiungi un pagamento:
1. L'app identifica tutte le fatture aperte del cliente
2. Le ordina per data (dalla più vecchia)
3. Distribuisce l'importo progressivamente
4. Aggiorna stato (APERTA → PARZIALE → SALDATA)
5. Scrive tutto su Google Sheets via Apps Script

---

## Problemi frequenti

**"Autorizzazione negata" su Apps Script**
→ Clicca "Rivedi autorizzazioni", poi "Avanzate" e "Vai a FIFO API"

**La sync non funziona**
→ Assicurati che l'URL inizi con `https://script.google.com/macros/s/`
→ Riprova la distribuzione su Apps Script

**Su iPhone non appare "Aggiungi alla schermata Home"**
→ Usa Safari, non Chrome o Firefox
