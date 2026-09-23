# CHANGELOG – Portale interventi interno

## Versione 2.1 (23/09/2026) – risparmio crediti Make

- Numero di versione: 2.1 (intestazione, piè di pagina e appVersion inviata a
  Make: "Interventi studio 2.1"). Data nel piè di pagina: 23/09/2026.
- Elenco condomini: resta salvato sul dispositivo con la data dell'ultimo
  scaricamento e si riscarica da Make (scenario 7434486, ramo "elenco") solo
  se ha più di 7 giorni. Accanto al numero dei condomini c'è il tasto
  "Aggiorna elenco" per scaricarlo subito. Prima veniva chiesto a Make a ogni
  apertura del portale (6 crediti per apertura); l'elenco da Dropbox si
  sincronizza comunque solo il 1° del mese. Al primo avvio della 2.1 l'elenco
  viene scaricato una volta, poi si usa la copia salvata.
- Controllo doppioni: non parte più da solo mentre si compila (prima 2–4
  chiamate Make per intervento, a ogni cambio di condominio, tipo e
  descrizione). Parte una sola volta quando si preme "Apri intervento", con
  condominio, tipo e descrizione già compilati; il pulsante mostra
  "Controllo doppioni…". Se trova un possibile doppione compare il riquadro
  con "È un problema diverso, invia" / "Annulla" (il secondo invio non ripete
  il controllo); se non trova nulla l'intervento parte subito; se il
  controllo non risponde l'intervento si invia comunque. Tolto il pannello
  del controllo sotto la Descrizione.
- Invariati: invio allo scenario Segnalazioni, conferma al contatto in loco,
  controllo doppioni locale (24 ore), storico degli ultimi 10 invii, grafica.

Le versioni precedenti sono descritte in CHANGELOG_v2.0.md.
