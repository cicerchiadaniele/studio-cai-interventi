# Studio CAI – Interventi (uso interno) v2.2

Versione semplificata del portale condomini (App Segnalazioni) riservata al personale di studio
(Daniele, Marco, Paolo, Simone) per aprire interventi di manutenzione.
Versione 2.2 del 23/09/2026 (vedi CHANGELOG_v2.2.md): stesse funzioni della 2.1 con grafica
allineata al portale condomini (piè di pagina, conferma bordeaux, intestazione, campi su iPhone).
Versione 2.1 (vedi CHANGELOG_v2.1.md): meno chiamate a Make (elenco condomini salvato sul
dispositivo per 7 giorni, controllo doppioni una sola volta all'invio).

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

## Tipi di intervento

Antennista, Ascensore, Cancelli elettrici, Contabilizzazione, Disinfestazioni,
Edilizia, Elettricista, Fabbro, Fognature, Giardinaggio, Idraulico,
Riscaldamento, Montascale, Pulizia, Videosorveglianza (15, gli stessi valori
del portale condomini 2.0 e delle colonne della base Airtable "FORNITORI
CONDOMINI"). Lo scenario Segnalazioni instrada a Li.Ca. Idraulico ed Edilizia
(con cartella Dropbox e record Airtable) e a Frateily Elettricista, Fabbro e
Antennista; gli altri tipi vengono registrati sul foglio e segnalati allo
studio (email e Telegram).

Nome esteso usato nella mail di conferma al contatto in loco per i nuovi tipi:
Contabilizzazione = "Contabilizzazione calore e acqua", Fognature = "Fognature
e spurghi", Pulizia = "Pulizia delle parti comuni", Videosorveglianza =
"Impianto di videosorveglianza". Le icone di Pulizia (scopa) e Fognature
(tombino) sono disegnate nel file App.js perché lucide-react 0.453 non le ha.

## Conferma al contatto in loco

Se nel "Contatto in loco" è indicata un'email, dopo la registrazione
dell'intervento l'app chiama un secondo webhook Make
(`Interventi interno - Conferma contatto in loco`, scenario 7466666
"Studio CAI – Interventi interno: conferma al contatto in loco"), che invia
al condomino la mail "Studio CAI – Intervento aperto per il suo condominio
[ticket]" dall'account Gmail dello studio. Campi inviati: ticket, timestamp,
nome, email, condominio, luogo (condominio, scala, interno), subcategoria,
ambito (nome esteso del tipo), descrizione (senza intestazione interna),
versione. Lo scenario Segnalazioni non è stato modificato.

Frase "Cosa succede ora", uguale per tutte le tipologie: "La richiesta è già
stata inoltrata alla ditta. Non deve fare altro: se il tecnico non riesce a
raggiungerla, ci contatterà e la richiameremo noi." Logo della mail: https://studio-cai-messenger.vercel.app/logo.jpg

## Controllo doppioni

Criterio unico nei due controlli: **stesso condominio, stesso tipo di
intervento e descrizione simile** (oppure stesso scala/interno). Entrambi
lavorano in sola lettura sul foglio Google delle segnalazioni, dove scrivono
sia l'app Segnalazioni dei condomini sia questo portale.

- **Nel portale, all'invio (dalla 2.1).** Quando si preme "Apri intervento"
  l'app chiama una sola volta il webhook `Interventi interno - Controllo
  doppioni` (scenario 7467174) con condominio, tipo, scala, interno e
  descrizione (campo `messaggio`), insieme al controllo locale delle ultime
  24 ore. Se c'è un possibile doppione chiede conferma ("È un problema
  diverso, invia" / "Annulla"), altrimenti invia subito. Se il controllo non
  risponde, l'intervento si invia comunque. Fino alla 2.0 il controllo partiva
  da solo a ogni cambio di condominio, tipo e descrizione.
- **Controllo giornaliero.** Scenario 7467201 "Studio CAI – Controllo doppioni
  segnalazioni (giornaliero)", lunedì–venerdì alle 8:00. Esamina le
  segnalazioni del giorno lavorativo precedente (il lunedì: venerdì, sabato e
  domenica), le confronta con quelle dei 7 giorni prima e, se trova probabili
  doppioni, manda una mail a studiocai.gestioneimmobili+segnalazioni@gmail.com
  e un riepilogo Telegram con l'inizio di ogni descrizione.

Confronto dell'indirizzo: minuscole, senza accenti e punteggiatura; ignorate
le parole generiche (via, viale, piazza, largo, condominio, civico, scala,
interno…); separazione di lettere e numeri ("Piagge92" = "Piagge 92"); parole
della via simili anche con un errore di battitura o abbreviate; civici
confrontati come numeri, con gli intervalli espansi ("Cipro 47-53" comprende
il 49). Se una delle due segnalazioni non ha civico basta la via.

Confronto della descrizione: tolti formule di cortesia, "Inserito da…",
contatto in loco, telefoni ed email; parole chiave confrontate per radice,
con i sinonimi più comuni raggruppati (perdita/infiltrazione/allagamento,
garage/box/autorimessa, luce/lampada/buio, citofono, cancello/portone,
scarico/tubo/intasamento, odore/puzza, contatore…). Descrizione simile se ha
in comune almeno il 30% delle parole chiave (o 3 parole e il 20%); se una
descrizione è troppo corta per giudicare conta come simile. Le segnalazioni
"Invio Documenti" sono escluse. Il controllo segnala soltanto, non chiude né
modifica interventi.

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
Ordinamento alfabetico lato app.

Dalla 2.1 l'elenco resta salvato sul dispositivo con la data dello
scaricamento (chiavi `cs_elenco_condomini` e `cs_elenco_condomini_ts`) e si
riscarica solo se ha più di 7 giorni o con il tasto "Aggiorna elenco" accanto
al numero dei condomini. Se lo scaricamento non riesce resta in uso l'ultima
copia salvata, con il tasto "Riprova".
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

Build verificata il 23/09/2026 con `CI=true` (nessun avviso ESLint).
Deploy su Vercel come progetto separato; `vercel.json` impedisce
l'indicizzazione sui motori di ricerca.
