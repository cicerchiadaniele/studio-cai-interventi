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

Due livelli, entrambi in sola lettura sul foglio Google delle segnalazioni
(dove scrivono sia l'app Segnalazioni dei condomini sia questo portale):

- **Nel portale, prima dell'invio.** Scelti condominio e tipo, l'app chiama il
  webhook `Interventi interno - Controllo doppioni` (scenario 7467174) e
  mostra le segnalazioni degli ultimi 14 giorni sullo stesso condominio: in
  evidenza quelle dello stesso tipo ("Possibile doppione"), in una lista
  apribile le altre. All'invio, se c'è un possibile doppione, chiede conferma
  ("È un problema diverso, invia" / "Annulla"). Se il controllo non risponde,
  l'intervento si invia comunque.
- **Controllo giornaliero.** Scenario 7467201 "Studio CAI – Controllo doppioni
  segnalazioni (giornaliero)", lunedì–venerdì alle 8:00. Esamina le
  segnalazioni del giorno lavorativo precedente (il lunedì: venerdì, sabato e
  domenica), le confronta con quelle dei 7 giorni prima e, se trova casi,
  manda una mail a studiocai.gestioneimmobili+segnalazioni@gmail.com e un
  riepilogo Telegram. Livelli: probabile doppione (stesso tipo), da
  verificare (tipo diverso ma stesso interno o parole in comune nella
  descrizione), stesso condominio con tipo diverso.

Confronto dell'indirizzo, identico nei due scenari (modulo Code di Make):
minuscole, senza accenti e punteggiatura; ignorate le parole generiche (via,
viale, piazza, largo, condominio, civico, scala, interno…); separazione di
lettere e numeri ("Piagge92" = "Piagge 92"); parole della via simili anche
con un errore di battitura ("Tarant" = "Taranto") o abbreviate; civici
confrontati come numeri, con gli intervalli espansi ("Cipro 47-53" comprende
il 49). Se una delle due segnalazioni non ha civico basta la via. Le
segnalazioni "Invio Documenti" sono escluse. Il controllo segnala soltanto,
non chiude né modifica interventi.

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
