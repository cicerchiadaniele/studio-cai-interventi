# CHANGELOG – Portale interventi interno

## Versione 2.2 (23/09/2026) – allineamento grafico al portale condomini

- Numero di versione: 2.2 (intestazione, piè di pagina e appVersion inviata a
  Make: "Interventi studio 2.2"). Data nel piè di pagina: 23/09/2026.
- Piè di pagina uguale a quello del portale condomini: riquadro bianco con
  "© anno Studio CAI — Tutti i diritti riservati" e
  "v2.2 · Ultimo aggiornamento: 23/09/2026".
- Riquadro "Intervento aperto": stesso stile bordeaux della conferma del
  portale condomini (fondo sfumato bordeaux chiaro, icona di spunta bordeaux).
  Tolto il verde da "Conferma inviata a …", da "conferma inviata" e dal
  bollino "Inviato" nell'elenco degli ultimi interventi (ora bordeaux).
- Intestazione allineata: "Studio CAI" con sottotitolo "Portale interventi
  interno", stessa spaziatura e badge versione del portale condomini.
  Aggiunti i due aloni bordeaux decorativi dello sfondo.
- iPhone e iPad: campi a 16px (niente zoom al tocco) e campi data/ora
  allineati, solo su Safari iOS/iPadOS (`src/index.css`).
- `tailwind.config.js`: aggiunti i colori `brand`, `brand-dark`,
  `brand-deep` e le opacità 8/12 come nelle altre app dello studio.
- `public/index.html` riscritto dal modello di casa (titolo, icone da
  `/logo.jpg`, font Fraunces, Manrope e JetBrains Mono, `noindex`).
- Invariati: webhook, campi inviati, controllo doppioni, elenco condomini
  salvato sul dispositivo, conferma al contatto in loco, storico locale,
  chiavi `localStorage`.

Le versioni precedenti sono descritte in CHANGELOG_v2.1.md e CHANGELOG_v2.0.md.
