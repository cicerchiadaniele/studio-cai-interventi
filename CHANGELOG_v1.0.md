# CHANGELOG – Portale interventi interno v1.0 (17/09/2026)

Prima versione, derivata da App Segnalazioni v9.5.

- Intestazione come le altre app: logo con badge, "Studio CAI", versione,
  sottotitolo "Portale interventi interno".
- In apertura data e ora correnti, con i secondi aggiornati in tempo reale.
- Chi inserisce: Daniele, Marco, Paolo, Simone (ordine alfabetico), scelta
  obbligatoria; viene ricordata sul dispositivo e resta dopo l'invio e dopo
  "Svuota modulo".
- Condominio da tendina con ricerca, elenco del Registro Chiavi (Airtable
  sincronizzato da Dropbox /STUDIO CAI/scritti_cai), ordine alfabetico.
- Contatto in loco facoltativo (nome, telefono, email), riportato nella
  descrizione che arriva al tecnico.
- Conferma via email al contatto in loco quando la sua email è compilata:
  scenario Make dedicato (ID 7466666) con webhook proprio; lo scenario
  Segnalazioni resta invariato. La mail riporta ticket, data, condominio con
  scala e interno, ambito, descrizione, "Cosa succede ora" (frase unica per
  tutte le tipologie), recapiti dello studio e logo; firma "Studio CAI".
  Nell'esito e nello storico compare "conferma inviata" o "conferma non
  partita".
- Tipologie di intervento in griglia con icone; valori inviati a Make
  identici a quelli della app Segnalazioni.
- Foto e documenti solo per Edilizia e Idraulico.
- Riepilogo compatto in fondo al modulo, aggiornato mentre si compila
  (operatore, condominio, tipo, contatto, allegati, inizio descrizione).
- Recapiti inviati: info@studiocai.it, 0678359769. Firma "Studio CAI".
- Invio allo stesso webhook della app Segnalazioni; appVersion inviata:
  "Interventi studio 1.0".
- Controllo doppioni sul dispositivo (stesso condominio e tipo nelle 24 ore).
- Controllo doppioni con l'app Segnalazioni dei condomini: pannello nel
  modulo con le segnalazioni degli ultimi 14 giorni sullo stesso condominio
  (scenario Make 7467174) e richiesta di conferma all'invio in caso di
  possibile doppione; controllo automatico giornaliero lun–ven alle 8:00 con
  mail e Telegram (scenario Make 7467201). Confronto tollerante su via e
  civico (abbreviazioni, errori di battitura, intervalli di civici).
- "Ultimi interventi da questo dispositivo" sotto il modulo, come nel
  Registro presenze portieri: ultimi 10 invii con data, operatore, ticket,
  allegati e stato (Inviato / Non inviato). Un intervento non inviato si
  ricarica nel modulo con un tocco (gli allegati vanno riaggiunti) oppure si
  elimina. Elenco locale, non sostituisce Airtable.
