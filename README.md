# Studio CAI – Interventi (uso interno) v1.0

Versione semplificata di App Segnalazioni 9.5 riservata al personale di studio
(Daniele, Marco, Paolo, Simone) per aprire interventi di manutenzione.

## Collegamenti

Invia allo stesso webhook Make della app Segnalazioni
(`Webapp - Segnalazioni`, scenario "Studio CAI – WebApp Segnalazioni"),
con gli stessi nomi di campo. Nessuna modifica allo scenario è necessaria:
Google Sheets, Telegram, email a Li.Ca. / Frateily, cartella Dropbox
`/STUDIO CAI/Interventi LI.CA`, scheda di lavoro e record Airtable
funzionano come per le segnalazioni dei condòmini.

Valori inviati:

- `categoria` = "Interventi di Manutenzione" (fissa)
- `nome` = "Studio CAI – <operatore>"
- `email` = info@studiocai.it · `telefono` = 0678359769
- `messaggio` = intestazione con operatore e contatto in loco + descrizione
- `consenso` = true (inserimento interno)
- ticket nel formato `CM-AAAAMMGG-XXXX`, identico alla app pubblica, così
  i controlli settimanali Dropbox/Airtable lo trattano allo stesso modo
- campi extra ignorati oggi dallo scenario: `origine`=studio, `operatore`,
  `referente_nome`, `referente_telefono`, `referente_email`

## Allegati

Foto e documenti si possono aggiungere solo per Edilizia e Idraulico
(le tipologie che lo scenario Make instrada a Li.Ca., con cartella Dropbox).
Per gli altri tipi il riquadro non compare e non viene inviato nulla.

## Elenco condomini

La tendina Condominio usa la stessa fonte della app Registro Chiavi: una
chiamata `azione=elenco` al webhook `WebApp Registro Chiavi`
(scenario 7434486, ramo di sola lettura). I nomi arrivano dalla tabella
Chiavi di Airtable (base appit0KcdaUdu5WE6), che lo scenario 7434508
sincronizza il 1° del mese dalle cartelle Dropbox `/STUDIO CAI/scritti_cai`
(escluse cartelle che iniziano con "-" o "z" e "Nuova cartella").
Ordinamento alfabetico lato app; l'ultima copia ricevuta resta salvata sul
dispositivo e viene mostrata subito, poi aggiornata.
Limite ereditato: 100 condomini per chiamata (oggi 75).

## Logo

`public/logo.jpg` è lo stesso della app Segnalazioni 9.5 (se mancasse,
l'intestazione mostra la scritta "CAI").

## Sviluppo e build

```bash
npm install
npm start
npm run build
```

Deploy su Vercel come progetto separato; `vercel.json` impedisce
l'indicizzazione sui motori di ricerca.
