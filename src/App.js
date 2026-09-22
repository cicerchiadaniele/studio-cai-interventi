import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle2, AlertCircle, Building2, Mail, Phone, Loader2,
  Paperclip, X, User, MapPin, Home, Wrench, FileText, UserCheck, RotateCcw, Eye,
  ChevronDown, Search, Check, Shield, Antenna, ArrowUpDown, Fence, Bug, BrickWall,
  Zap, KeyRound, Trees, Droplets, Flame, Accessibility, Clock, ClipboardList, History, Copy, Info, Gauge, Cctv
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Studio CAI – Interventi (versione interna per il personale di studio)
// Deriva da App Segnalazioni v9.5: stesso webhook Make, stessi collegamenti
// (Google Sheets, Telegram, email a Li.Ca./Frateily, cartella Dropbox
// Interventi LI.CA, record Airtable). Cambia solo il modulo:
//  - al posto di nome/email/telefono del condomino si sceglie l'operatore;
//  - email e telefono inviati sono sempre quelli dello studio;
//  - il contatto del condomino in loco è facoltativo e finisce nel messaggio,
//    così arriva al tecnico senza toccare lo scenario Make.
// ─────────────────────────────────────────────────────────────
const APP_VERSION = "2.0";
const APP_TAG = `Interventi studio ${APP_VERSION}`; // come arriva a Make
const BUILD_DATE_LABEL = "22/09/2026";

const WEBHOOK_DEFAULT = "https://hook.eu1.make.com/xvuih8pqxk96q9v6bjpls6u8e4k4f5qv";
const STUDIO = { nome: "Studio CAI", email: "info@studiocai.it", telefono: "0678359769" };
const OPERATORI = ["Daniele", "Marco", "Paolo", "Simone"]; // ordine alfabetico

// Conferma via email al contatto in loco: scenario Make dedicato
// "Studio CAI – Interventi interno: conferma al contatto in loco" (ID 7466666).
// Parte solo se l'email del contatto è compilata e solo dopo che l'intervento
// è stato registrato. Lo scenario Segnalazioni non viene toccato.
const CONFERMA_URL = "https://hook.eu1.make.com/yvar1ljfibyqyee6ip3dbhk9q7jraclw";

// Controllo doppioni: scenario Make "Studio CAI – Interventi interno: controllo
// doppioni (ricerca)" (ID 7467174). Legge il foglio Google in cui scrivono sia la
// app Segnalazioni dei condomini sia questo portale e restituisce le segnalazioni
// degli ultimi 14 giorni sullo stesso condominio (confronto tollerante su via e
// civico) e dello stesso tipo; se arriva la descrizione, solo quelle con
// descrizione simile o stesso scala/interno. Sola lettura.
const CONTROLLO_URL = "https://hook.eu1.make.com/650oqgo7rg4fy1d88r67pe02ueugq1cv";

// Elenco condomini: stessa fonte della app Registro Chiavi.
// Lo scenario Make "Studio CAI – WebApp Registro Chiavi" (ID 7434486), con azione=elenco,
// restituisce i record della tabella Chiavi di Airtable, che lo scenario 7434508
// sincronizza il 1° del mese dalle cartelle Dropbox /STUDIO CAI/scritti_cai
// (escluse le cartelle che iniziano con "-" o "z" e "Nuova cartella").
// Il ramo "elenco" è di sola lettura: lo scenario non va modificato.
const ELENCO_URL = "https://hook.eu1.make.com/bxtcwfhdeqixkixygyh8m4u59xfmlcxo";
const ELENCO_TIMEOUT_MS = 25000;
const ELENCO_CACHE_KEY = "cs_elenco_condomini";

// In anteprima (render grafico) l'invio è simulato: nessuna chiamata a Make.
const PREVIEW = typeof window !== "undefined" && window.__CAI_PREVIEW__ === true;

const MAX_FILE = 5;
const MAX_MB = 10;

// Icona scopa per "Pulizia": la lucide-react 0.453 usata dall'app non ce l'ha;
// disegno ripreso dall'icona "broom" delle versioni successive di Lucide (licenza ISC),
// stesso tratto e stesse dimensioni delle altre icone.
function Scopa({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M13.5 10.5 22 2" />
      <path d="M14.734 13.841a2 2 0 00-.314-2.42L12.58 9.58a2 2 0 00-2.421-.314l-7.657 4.461A1 1 0 002.3 15.3l6.403 6.403a1 1 0 001.571-.204z" />
      <path d="m5 18 2-2" />
      <path d="m7.699 10.7 5.602 5.601" />
    </svg>
  );
}

// Icona tombino per "Fognature" (non presente in lucide-react): griglia rotonda,
// stesso tratto delle altre icone.
function Tombino({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M7 8.5h10" />
      <path d="M6 12h12" />
      <path d="M7 15.5h10" />
    </svg>
  );
}

// "value" deve restare identico: lo scenario Make instrada su questi testi.
const TIPI_INTERVENTO = [
  // "ambito" è il nome usato nella mail di conferma al condomino
  { value: "Antennista", label: "Antennista", ambito: "Impianto TV e antenna", icon: Antenna },
  { value: "Ascensore", label: "Ascensore", ambito: "Ascensore", icon: ArrowUpDown },
  { value: "Cancelli Elettrici", label: "Cancelli elettrici", ambito: "Cancelli elettrici", icon: Fence },
  { value: "Contabilizzazione", label: "Contabilizzazione", ambito: "Contabilizzazione calore e acqua", icon: Gauge },
  { value: "Disinfestazioni/Derattizzazioni", label: "Disinfestazioni", ambito: "Disinfestazione e derattizzazione", icon: Bug },
  { value: "Edilizia", label: "Edilizia", ambito: "Opere edili", icon: BrickWall },
  { value: "Elettricista", label: "Elettricista", ambito: "Impianto elettrico", icon: Zap },
  { value: "Fabbro", label: "Fabbro", ambito: "Serramenti e opere in ferro", icon: KeyRound },
  { value: "Fognature", label: "Fognature", ambito: "Fognature e spurghi", icon: Tombino },
  { value: "Giardinaggio", label: "Giardinaggio", ambito: "Verde condominiale", icon: Trees },
  { value: "Idraulico", label: "Idraulico", ambito: "Impianto idraulico", icon: Droplets },
  { value: "Impianto di Riscaldamento", label: "Riscaldamento", ambito: "Impianto di riscaldamento", icon: Flame },
  { value: "Montascale", label: "Montascale", ambito: "Montascale", icon: Accessibility },
  // Contabilizzazione, Fognature, Pulizia e Videosorveglianza: lo scenario Make non le instrada a ditte,
  // arrivano allo studio (foglio, email, Telegram). Stessi valori del portale condomini 2.0.
  { value: "Pulizia", label: "Pulizia", ambito: "Pulizia delle parti comuni", icon: Scopa },
  { value: "Videosorveglianza", label: "Videosorveglianza", ambito: "Impianto di videosorveglianza", icon: Cctv },
];
// Foto e documenti solo per questi tipi di intervento
const TIPI_CON_ALLEGATI = ["Edilizia", "Idraulico"];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const cn = (...cls) => cls.filter(Boolean).join(" ");

const sanitizers = {
  condominio: (v) => v.replace(/[^\p{L}\p{N}\s.,'-]/gu, ""),
  scala: (v) => v.replace(/[^\p{L}\p{N}\s./-]/gu, ""),
  interno: (v) => v.replace(/[^\p{L}\p{N}\s./-]/gu, ""),
  refNome: (v) => v.replace(/[^\p{L}\s'-]/gu, ""),
  refTelefono: (v) => v.replace(/[^\d\s+]/g, ""),
};

// Pulizia finale (stesse regole della 9.5): il condominio finisce nel nome
// della cartella Dropbox, che non può terminare con spazio o punto.
const squash = (v) => String(v ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
const finalizers = {
  condominio: (v) => squash(v).replace(/^[\s.,'-]+|[\s.,'-]+$/g, ""),
  scala: (v) => squash(v),
  interno: (v) => squash(v),
  refNome: (v) => squash(v).replace(/^[\s'-]+|[\s'-]+$/g, ""),
  refEmail: (v) => String(v ?? "").replace(/\s+/g, "").toLowerCase(),
  refTelefono: (v) => squash(v),
  messaggio: (v) => String(v ?? "").normalize("NFC").replace(/[ \t]+\n/g, "\n").trim(),
};
const finalizeValue = (k, v) => (finalizers[k] && typeof v === "string" ? finalizers[k](v) : v);
const finalizeForm = (f) => {
  const out = { ...f };
  Object.keys(finalizers).forEach((k) => { out[k] = finalizeValue(k, out[k]); });
  return out;
};

const scurisci = (hex, q) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.round(v * (1 - q))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};

// Memoria locale del dispositivo: operatore scelto, condomini usati di recente
// (per il suggerimento in digitazione) e storico per il controllo doppioni.
const OPERATORE_KEY = "cs_operatore";
const INVII_KEY = "cs_invii";
const INVII_MAX = 10;
const ORE_DOPPIONE = 24;

const leggi = (k, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(k) || ""); return v ?? fallback; } catch { return fallback; }
};
const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* memoria non disponibile */ } };

const chiave = (v) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
// Stessa normalizzazione della app Registro Chiavi per la ricerca
const normalizza = (v) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// Snapshot usato solo nell'anteprima grafica (lì le chiamate esterne sono bloccate)
const ELENCO_ANTEPRIMA = [
  "Acqui 11", "Albera 11", "Alberone 2", "Amantea 36", "Amari 39", "Amari 69", "Amari 7", "Aosta 61",
  "Appia 47", "Appia Archeologica I", "Appia Nuova 113", "Appia Nuova 555 - Genzano 12", "Asti 6",
  "Begonie", "Botero 60", "Capocci 95", "Cattaneo 10", "Cipro 47-53 - M.Bragadin 50",
  "Comparto R1 - Piagge 92-94", "Comparto Z1B Edificio 1", "Da Como 1-2-3", "Dalie", "Don Rua 23",
  "Don Rua 37", "Eurialo 92C", "Fidene 19", "Filiberto 191", "Folco Portinari 37", "Gela 89",
  "La Spezia 92", "Lepido 35-37", "Magna Grecia 20-26", "Manlio Torquato 50", "Mantellini 12",
  "Manzoni 28", "Marco Polo 84", "Matera 1", "Mauritania 3", "Mauritania 3-5", "Mauritania 5",
  "Meropia 28", "Monte Urano 47", "Nomentum 49-61", "Norcia 12", "Palazzo Ciancaleoni",
  "Pescara 2 Lotto H", "Piagge 75-89", "Piagge92 DE", "Piagge92 FGH", "Pistoia 26", "Pordenone 21",
  "Quarto Miglio 122", "Reginaldo Giuliani 12", "Richelmy 38", "Roberto Bracco 68", "Robecchi Brichetti 23",
  "Rocca di Papa 28", "Rocca Priora 12", "S.M.Ausiliatrice 10", "S.M.Ausiliatrice 4", "San Remo 1",
  "San Remo 1-3", "Saturnia 49", "Scevola 35", "Servilio IV 14", "Stilicone 264", "Tabarrini 15",
  "Tabarrini 4", "Taranto 44", "Todi 60", "Tor Fiscale", "Tuscolana 382", "Tuscolana 851", "Urbana 80",
  "Vigna Lais 5"
];

const ordina = (lista) => Array.from(new Set(lista.map((x) => squash(x)).filter(Boolean)))
  .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base", numeric: true }));

// Richiesta form-urlencoded come nel Registro Chiavi: nessun preflight CORS.
async function caricaCondomini() {
  if (PREVIEW) {
    await new Promise((r) => setTimeout(r, 400));
    return ordina(ELENCO_ANTEPRIMA);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ELENCO_TIMEOUT_MS);
  try {
    const res = await fetch(ELENCO_URL, {
      method: "POST",
      body: new URLSearchParams({ azione: "elenco", versione: APP_TAG }),
      signal: ctrl.signal,
    });
    const json = JSON.parse(await res.text());
    if (!res.ok || !json || json.ok !== true) throw new Error("L'elenco condomini non è arrivato.");
    return ordina((json.chiavi || []).map((r) => r.fields?.Condominio));
  } catch (e) {
    if (e.name === "AbortError") throw new Error("L'elenco condomini non ha risposto entro 25 secondi.");
    if (e instanceof TypeError) throw new Error("Connessione assente: elenco condomini non raggiungibile.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
// Storico locale degli invii (come nel Registro presenze portieri): solo
// riscontro sul dispositivo, non sostituisce Airtable. Gli allegati non si
// conservano: un intervento non inviato si ricarica nel modulo e i file
// vanno riaggiunti.
const leggiInvii = () => {
  const v = leggi(INVII_KEY, []);
  return Array.isArray(v) ? v.filter((x) => x && x.id) : [];
};
const salvaInvii = (lista) => scrivi(INVII_KEY, lista.slice(0, INVII_MAX));

// Chiave del controllo doppioni: condominio, tipo e descrizione confrontata
const chiaveVerifica = (condominio, tipo, descr) => `${condominio}|${tipo}|${descr || ""}`;
const descrPerVerifica = (m) => { const v = finalizeValue("messaggio", m || ""); return v.length >= 3 ? v : ""; };

const interventoRecente = (condominio, tipo) => {
  const limite = Date.now() - ORE_DOPPIONE * 3600 * 1000;
  return leggiInvii().find((v) =>
    v.stato === "inviato" && v.ts > limite &&
    chiave(v.condominio) === chiave(condominio) && v.tipo === tipo) || null;
};

const quando = (ts) => {
  const d = new Date(ts);
  const oggi = new Date();
  const ieri = new Date(); ieri.setDate(oggi.getDate() - 1);
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === oggi.toDateString()) return `oggi ${ora}`;
  if (d.toDateString() === ieri.toDateString()) return `ieri ${ora}`;
  return `${d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })} ${ora}`;
};

// Esempio usato solo nell'anteprima grafica
const esempioControllo = (condominio, tipo) => {
  const n = normalizza(condominio);
  if (!n.includes("donrua23") && !n.includes("taranto44")) return [];
  return [
    { data: "15/09/2026", ticket: "CM-20260915-K7QD", condominio: condominio.replace(/^/, "Via "), scala: "B", interno: "7",
      tipo: tipo || "Idraulico", origine: "condomino", nome: "Mario Rossi",
      estratto: "Perdita d'acqua dal soffitto del box al piano -1, presente da tre giorni.", livello: "alta" },
    { data: "11/09/2026", ticket: "CM-20260911-2PLA", condominio, scala: "", interno: "",
      tipo: "Elettricista", origine: "studio", nome: "Studio CAI – Marco",
      estratto: "Luce scale spenta al secondo piano.", livello: "bassa" },
  ];
};

async function controllaDoppioni({ condominio, subcategoria, scala, interno, messaggio }) {
  if (PREVIEW) {
    await new Promise((r) => setTimeout(r, 700));
    return esempioControllo(condominio, subcategoria);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(CONTROLLO_URL, {
      method: "POST",
      signal: ctrl.signal,
      body: new URLSearchParams({ condominio, subcategoria, scala: scala || "", interno: interno || "", messaggio: messaggio || "", versione: APP_TAG }),
    });
    const json = JSON.parse(await res.text());
    if (!res.ok || !json || json.ok !== true) throw new Error("risposta non valida");
    return Array.isArray(json.trovati) ? json.trovati : [];
  } finally {
    clearTimeout(timer);
  }
}

// Il contatto in loco viaggia dentro il messaggio: così compare nella mail al
// tecnico, su Telegram, su Sheets, su Airtable e nella scheda di lavoro Dropbox.
const componiMessaggio = (f) => {
  const righe = [`[Inserito da ${STUDIO.nome} – ${f.operatore}]`];
  const contatto = [
    f.refNome,
    f.refTelefono && `tel. ${f.refTelefono}`,
    f.refEmail
  ].filter(Boolean).join(" – ");
  righe.push(contatto ? `Contatto in loco: ${contatto}` : "Contatto in loco: nessuno (riferirsi allo studio)");
  return `${righe.join("\n")}\n\n${f.messaggio}`;
};

// Invio della conferma al contatto in loco. Richiesta form-urlencoded (nessun
// preflight CORS). Un errore qui non annulla l'intervento, già registrato.
async function inviaConferma(clean, ticket, timestamp) {
  const tipo = TIPI_INTERVENTO.find((t) => t.value === clean.subcategoria);
  const luogo = [clean.condominio, clean.scala && `scala ${clean.scala}`, clean.interno && `interno ${clean.interno}`]
    .filter(Boolean).join(", ");
  if (PREVIEW) { await new Promise((r) => setTimeout(r, 400)); return true; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(CONFERMA_URL, {
      method: "POST",
      signal: ctrl.signal,
      body: new URLSearchParams({
        ticket, timestamp,
        nome: clean.refNome || "",
        email: clean.refEmail,
        condominio: clean.condominio,
        luogo,
        subcategoria: clean.subcategoria,
        ambito: tipo?.ambito || clean.subcategoria,
        descrizione: clean.messaggio,
        versione: APP_TAG,
      }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const formVuoto = (operatore = "") => ({
  operatore,
  condominio: "", scala: "", interno: "",
  refNome: "", refTelefono: "", refEmail: "",
  subcategoria: "", messaggio: "",
  files: []
});

export default function StudioInterventi() {
  const primary = "#8B1538";
  // "Chi inserisce" viene ricordato su questo dispositivo: resta obbligatorio,
  // ma alla prima apertura va scelto e poi si ritrova già selezionato.
  const [form, setForm] = useState(() => {
    const o = leggi(OPERATORE_KEY, "");
    return formVuoto(OPERATORI.includes(o) ? o : "");
  });
  const [invii, setInvii] = useState(() => leggiInvii());
  const [rifNonInviato, setRifNonInviato] = useState(null);

  const registraInvio = (voce, rimuoviId) => {
    const lista = [voce, ...leggiInvii().filter((v) => v.id !== voce.id && v.id !== rimuoviId)];
    salvaInvii(lista);
    setInvii(leggiInvii());
  };
  const ricaricaNonInviato = (v) => {
    setForm({
      ...formVuoto(v.operatore),
      condominio: v.condominio, scala: v.scala || "", interno: v.interno || "",
      refNome: v.refNome || "", refTelefono: v.refTelefono || "", refEmail: v.refEmail || "",
      subcategoria: v.tipo, messaggio: v.messaggio || "",
    });
    setDescrVerifica(descrPerVerifica(v.messaggio));
    setTouched({});
    setResult(null);
    setRifNonInviato(v.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const eliminaVoce = (id) => {
    salvaInvii(leggiInvii().filter((v) => v.id !== id));
    setInvii(leggiInvii());
    if (rifNonInviato === id) setRifNonInviato(null);
  };
  const [touched, setTouched] = useState({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [doppione, setDoppione] = useState(null);
  // Controllo doppioni su app condomini + portale (ultimi 14 giorni): stesso
  // condominio e tipo; quando la descrizione è scritta (all'uscita dal campo)
  // il controllo si ripete confrontando anche la descrizione.
  const [verifica, setVerifica] = useState({ stato: "vuoto", chiave: "", trovati: [], conDescr: false });
  const [descrVerifica, setDescrVerifica] = useState("");
  React.useEffect(() => {
    if (!form.condominio || !form.subcategoria) { setVerifica({ stato: "vuoto", chiave: "", trovati: [], conDescr: false }); return; }
    const k = chiaveVerifica(form.condominio, form.subcategoria, descrVerifica);
    const conDescr = !!descrVerifica;
    let annullato = false;
    setVerifica((v) => ({ ...v, stato: "carico", chiave: k, conDescr }));
    const t = setTimeout(async () => {
      try {
        const trovati = await controllaDoppioni({ condominio: form.condominio, subcategoria: form.subcategoria, scala: form.scala, interno: form.interno, messaggio: descrVerifica });
        if (!annullato) setVerifica({ stato: "ok", chiave: k, trovati, conDescr });
      } catch {
        if (!annullato) setVerifica({ stato: "errore", chiave: k, trovati: [], conDescr });
      }
    }, 500);
    return () => { annullato = true; clearTimeout(t); };
    // scala e interno non rilanciano la ricerca da soli: vengono letti al momento del controllo
  }, [form.condominio, form.subcategoria, descrVerifica]); // eslint-disable-line
  // Elenco condomini: si mostra subito la copia salvata, poi si aggiorna da Make.
  const [condomini, setCondomini] = useState(() => {
    const c = leggi(ELENCO_CACHE_KEY, []);
    return PREVIEW || !Array.isArray(c) ? [] : c;
  });
  const [elencoStato, setElencoStato] = useState("caricamento"); // caricamento | ok | errore
  const [elencoErrore, setElencoErrore] = useState("");

  const aggiornaElenco = React.useCallback(async () => {
    setElencoStato("caricamento");
    try {
      const lista = await caricaCondomini();
      setCondomini(lista);
      if (!PREVIEW) scrivi(ELENCO_CACHE_KEY, lista);
      setElencoStato("ok");
    } catch (e) {
      setElencoErrore(e.message);
      setElencoStato("errore");
    }
  }, []);

  React.useEffect(() => { document.title = "Interventi – Studio CAI"; aggiornaElenco(); }, [aggiornaElenco]);

  const cssVars = useMemo(() => ({
    "--brand": primary,
    "--brand-dark": scurisci(primary, 0.22),
    "--brand-deep": scurisci(primary, 0.38),
  }), [primary]);

  const update = (k, v) => {
    const clean = sanitizers[k] ? sanitizers[k](v) : v;
    setForm((s) => ({ ...s, [k]: clean }));
    setTouched((t) => ({ ...t, [k]: true }));
  };
  const finalizeField = (k) => {
    setForm((s) => ({ ...s, [k]: finalizeValue(k, s[k]) }));
    setTouched((t) => ({ ...t, [k]: true }));
  };
  const scegliOperatore = (o) => {
    setForm((s) => ({ ...s, operatore: o }));
    setTouched((t) => ({ ...t, operatore: true }));
    scrivi(OPERATORE_KEY, o);
  };

  const errore = (field) => {
    if (!touched[field]) return null;
    const v = finalizeValue(field, form[field]);
    switch (field) {
      case "operatore": return !form.operatore ? "Indica chi sta inserendo l'intervento" : null;
      case "condominio": return !v ? "Scegli il condominio dall'elenco" : null;
      case "refTelefono": return v && v.replace(/\D/g, "").length < 6 ? "Numero troppo breve" : null;
      case "refEmail": return v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Email non valida" : null;
      case "subcategoria": return !form.subcategoria ? "Scegli il tipo di intervento" : null;
      case "messaggio": return !v ? "Campo obbligatorio" : v.length < 3 ? "Descrizione troppo breve" : null;
      default: return null;
    }
  };

  const validate = (f) => {
    const errs = [];
    if (!f.operatore) errs.push("Indica chi sta inserendo l'intervento");
    if (!f.condominio) errs.push("Scegli il condominio dall'elenco");
    else if (condomini.length && !condomini.some((c) => chiave(c) === chiave(f.condominio))) errs.push("Il condominio non è nell'elenco: sceglilo dalla tendina");
    if (f.refTelefono && f.refTelefono.replace(/\D/g, "").length < 6) errs.push("Telefono del contatto troppo breve");
    if (f.refEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.refEmail)) errs.push("Email del contatto non valida");
    if (!f.subcategoria) errs.push("Scegli il tipo di intervento");
    if (!f.messaggio || f.messaggio.length < 3) errs.push("Descrivi l'intervento");
    const files = TIPI_CON_ALLEGATI.includes(f.subcategoria) ? (f.files || []) : [];
    if (files.length > MAX_FILE) errs.push(`Puoi allegare al massimo ${MAX_FILE} file`);
    if (files.some((x) => !/\.(pdf|jpg|jpeg|png)$/i.test(x.name))) errs.push("Sono ammessi solo PDF o immagini (jpg, jpeg, png)");
    if (files.some((x) => x.size > MAX_MB * 1024 * 1024)) errs.push(`Ogni file deve stare sotto i ${MAX_MB} MB`);
    return errs;
  };

  const submit = async (forza = false) => {
    setTouched({ operatore: true, condominio: true, refTelefono: true, refEmail: true, subcategoria: true, messaggio: true });
    const clean = finalizeForm(form);
    setForm(clean);

    const errs = validate(clean);
    if (errs.length) { setResult({ ok: false, error: errs[0] }); return; }

    if (!forza) {
      const prec = interventoRecente(clean.condominio, clean.subcategoria);
      const kInvio = chiaveVerifica(clean.condominio, clean.subcategoria, descrPerVerifica(clean.messaggio));
      let remoti = [];
      if (verifica.chiave === kInvio && verifica.stato === "ok") {
        remoti = verifica.trovati.filter((x) => x.livello === "alta");
      } else {
        // controllo con la descrizione non ancora concluso: lo si fa ora (se non risponde si invia comunque)
        setSending(true);
        try {
          const tr = await controllaDoppioni({ condominio: clean.condominio, subcategoria: clean.subcategoria, scala: clean.scala, interno: clean.interno, messaggio: descrPerVerifica(clean.messaggio) });
          remoti = tr.filter((x) => x.livello === "alta");
        } catch { remoti = []; }
        setSending(false);
      }
      if (prec || remoti.length) { setDoppione({ locale: prec, remoti }); return; }
    }
    setDoppione(null);
    setSending(true);
    setResult(null);

    const timestamp = new Date().toISOString();
    const ticket = `CM-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Stessi nomi di campo della app Segnalazioni: lo scenario Make li legge così.
    const payload = {
      condominio: clean.condominio,
      scala: clean.scala,
      interno: clean.interno,
      nome: `${STUDIO.nome} – ${clean.operatore}`,
      email: STUDIO.email,
      telefono: STUDIO.telefono,
      categoria: "Interventi di Manutenzione",
      subcategoria: clean.subcategoria,
      messaggio: componiMessaggio(clean),
      consenso: "true",
      ticket,
      timestamp,
      appVersion: APP_TAG,
      // Campi aggiuntivi: oggi lo scenario li ignora, restano disponibili per usi futuri.
      origine: "studio",
      operatore: clean.operatore,
      referente_nome: clean.refNome,
      referente_telefono: clean.refTelefono,
      referente_email: clean.refEmail,
    };

    try {
      if (PREVIEW) {
        await new Promise((r) => setTimeout(r, 900));
      } else {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v ?? "")));
        if (TIPI_CON_ALLEGATI.includes(clean.subcategoria)) {
          (clean.files || []).forEach((f) => fd.append("file1", f, f.name));
        }
        const res = await fetch(WEBHOOK_DEFAULT, { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Make ha risposto con errore ${res.status}. L'intervento non è stato registrato: riprova.`);
      }
      // Conferma al contatto in loco, solo se l'email è stata indicata
      let conferma = null;
      if (clean.refEmail) {
        conferma = (await inviaConferma(clean, ticket, timestamp)) ? "inviata" : "non_inviata";
      }
      setResult({ ok: true, ticket, condominio: clean.condominio, tipo: clean.subcategoria, conferma, refEmail: clean.refEmail });
      registraInvio({
        id: ticket, ticket, ts: Date.now(), stato: "inviato",
        operatore: clean.operatore, condominio: clean.condominio,
        scala: clean.scala, interno: clean.interno, tipo: clean.subcategoria,
        allegati: TIPI_CON_ALLEGATI.includes(clean.subcategoria) ? (clean.files || []).length : 0,
        conferma,
      }, rifNonInviato);
      setRifNonInviato(null);
      setForm(formVuoto(clean.operatore));
      setDescrVerifica("");
      setTouched({});
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setResult({ ok: false, error: e.message || "Invio non riuscito: controlla la connessione e riprova." });
      const idKo = rifNonInviato || `KO-${Date.now()}`;
      registraInvio({
        id: idKo, ticket: "", ts: Date.now(), stato: "non_inviato",
        operatore: clean.operatore, condominio: clean.condominio,
        scala: clean.scala, interno: clean.interno, tipo: clean.subcategoria,
        messaggio: clean.messaggio, refNome: clean.refNome,
        refTelefono: clean.refTelefono, refEmail: clean.refEmail,
        allegati: TIPI_CON_ALLEGATI.includes(clean.subcategoria) ? (clean.files || []).length : 0,
      });
      setRifNonInviato(idKo);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-paper bg-noise text-neutral-900" style={cssVars}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-neutral-200/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Logo />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand)] ring-2 ring-white flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-xl sm:text-2xl leading-tight truncate">Studio CAI</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white tracking-wide">
                v{APP_VERSION}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">Portale interventi interno</p>
          </div>
        </div>
      </header>

      {PREVIEW && (
        <div className="relative z-10 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" /> Anteprima grafica: l'invio è simulato, a Make non parte nulla.
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Orologio />

        {/* Esito */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "mb-5 rounded-2xl border p-4 sm:p-5 shadow-soft",
                result.ok ? "bg-white border-[#8B1538]/30" : "bg-red-50 border-red-300"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                  result.ok ? "bg-[var(--brand)] text-white" : "bg-red-100 text-red-700")}>
                  {result.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  {result.ok ? (
                    <>
                      <p className="font-display font-semibold text-lg leading-tight text-[var(--brand-deep)]">Intervento aperto</p>
                      <p className="text-sm text-neutral-600 mt-0.5">{result.tipo} · {result.condominio}</p>
                      <p className="mt-2 font-mono font-bold text-[var(--brand-dark)] text-lg select-all break-all">{result.ticket}</p>
                      {result.conferma === "inviata" && (
                        <p className="mt-1.5 text-xs text-emerald-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Conferma inviata a {result.refEmail}
                        </p>
                      )}
                      {result.conferma === "non_inviata" && (
                        <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Intervento registrato, ma la conferma a {result.refEmail} non è partita: avvisa il condomino a voce o per email.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-display font-semibold text-lg leading-tight text-red-900">Intervento non inviato</p>
                      <p className="text-sm text-red-700 mt-0.5">{result.error}</p>
                    </>
                  )}
                </div>
                <button onClick={() => setResult(null)} className="p-1.5 rounded-lg hover:bg-neutral-100" aria-label="Chiudi">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-3xl shadow-lift ring-1 ring-neutral-200/80 overflow-hidden">
          <div className="bg-gradient-to-br from-[var(--brand)] via-[var(--brand-dark)] to-[var(--brand-deep)] px-5 sm:px-7 py-5">
            <div className="flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <p className="font-display font-semibold text-xl text-white leading-tight">Nuovo intervento</p>
            </div>
          </div>
          <div className="p-5 sm:p-7 divide-y divide-neutral-100 [&>*]:py-7 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">

            {/* Operatore */}
            <Sezione n={1} icon={<UserCheck className="w-4 h-4" />} title="Chi inserisce" required>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OPERATORI.map((o) => {
                  const on = form.operatore === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => scegliOperatore(o)}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 text-left transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8B1538]/20",
                        on ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                           : "border-neutral-200 bg-white hover:border-neutral-300"
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold text-sm flex-shrink-0",
                        on ? "bg-white/20 text-white" : "bg-[#8B1538]/10 text-[var(--brand)]"
                      )}>{o[0]}</span>
                      <span className="font-semibold text-sm">{o}</span>
                    </button>
                  );
                })}
              </div>
              {errore("operatore") && <Errore testo={errore("operatore")} />}
            </Sezione>

            {/* Immobile */}
            <Sezione n={2} icon={<Home className="w-4 h-4" />} title="Immobile">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <TendinaCondominio
                    value={form.condominio}
                    elenco={condomini}
                    stato={elencoStato}
                    messaggioErrore={elencoErrore}
                    onRiprova={aggiornaElenco}
                    onChange={(v) => { setForm((s) => ({ ...s, condominio: v })); setTouched((t) => ({ ...t, condominio: true })); }}
                    error={errore("condominio")}
                  />
                </div>
                <Campo label="Scala" placeholder="Es. A" value={form.scala}
                  onChange={(v) => update("scala", v)} onBlur={() => finalizeField("scala")} />
                <Campo label="Interno" placeholder="Es. 12" value={form.interno}
                  onChange={(v) => update("interno", v)} onBlur={() => finalizeField("interno")} />
              </div>
            </Sezione>

            {/* Contatto in loco */}
            <Sezione n={3} icon={<User className="w-4 h-4" />} title="Contatto in loco" facoltativo>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Campo label="Nome e cognome" placeholder="Es. Mario Rossi" value={form.refNome}
                    onChange={(v) => update("refNome", v)} onBlur={() => finalizeField("refNome")}
                    icon={<User className="w-4 h-4" />} />
                </div>
                <Campo label="Telefono" placeholder="Es. 333 123 4567" value={form.refTelefono}
                  onChange={(v) => update("refTelefono", v)} onBlur={() => finalizeField("refTelefono")}
                  icon={<Phone className="w-4 h-4" />} error={errore("refTelefono")} inputMode="tel" />
                <Campo label="Email" type="email" placeholder="nome@email.it" value={form.refEmail}
                  onChange={(v) => update("refEmail", v)} onBlur={() => finalizeField("refEmail")}
                  icon={<Mail className="w-4 h-4" />} error={errore("refEmail")} />
              </div>
            </Sezione>

            {/* Intervento */}
            <Sezione n={4} icon={<Wrench className="w-4 h-4" />} title="Intervento">
              <p className="text-sm font-semibold text-neutral-700 mb-2">Tipo di intervento <span className="text-red-500">*</span></p>
              <div role="radiogroup" className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {TIPI_INTERVENTO.map(({ value, label, icon: Icona }) => {
                  const on = form.subcategoria === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      title={value}
                      onClick={() => {
                        update("subcategoria", value);
                        if (!TIPI_CON_ALLEGATI.includes(value)) setForm((s) => ({ ...s, subcategoria: value, files: [] }));
                      }}
                      className={cn(
                        "group flex flex-col items-start gap-2 min-h-[5.25rem] p-3 sm:flex-row sm:items-center sm:gap-3 sm:min-h-0 sm:h-14 sm:py-0 rounded-2xl border-2 text-left transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8B1538]/20",
                        on ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-md"
                           : "border-neutral-200 bg-white text-neutral-800 hover:border-[#8B1538]/40 hover:bg-[#8B1538]/[0.03]"
                      )}
                    >
                      <span className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                        on ? "bg-white/20 text-white" : "bg-[#8B1538]/10 text-[var(--brand)]"
                      )}>
                        <Icona className="w-[18px] h-[18px]" />
                      </span>
                      <span className="text-[13px] font-semibold leading-tight min-w-0 break-words">{label}</span>
                    </button>
                  );
                })}
              </div>
              {errore("subcategoria") && <Errore testo={errore("subcategoria")} />}

              <div className="mt-5">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-4 h-4" /> Descrizione <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 min-h-[120px] resize-y bg-white placeholder:text-neutral-400",
                    errore("messaggio")
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                      : "border-neutral-300 focus:ring-[#8B1538]/20 focus:border-[var(--brand)]"
                  )}
                  placeholder="Es. Citofono della scala B non suona all'interno 7. Il condomino è presente dopo le 15."
                  value={form.messaggio}
                  onChange={(e) => update("messaggio", e.target.value)}
                  onBlur={() => { finalizeField("messaggio"); setDescrVerifica(descrPerVerifica(form.messaggio)); }}
                  maxLength={1800}
                />
                <div className="mt-1 flex items-center justify-between">
                  {errore("messaggio") ? <Errore testo={errore("messaggio")} inline /> : <span />}
                  <span className="text-xs text-neutral-500 tabular-nums">{form.messaggio.length} / 1800</span>
                </div>
              </div>

              <PannelloVerifica verifica={verifica} />

              <AnimatePresence initial={false}>
                {TIPI_CON_ALLEGATI.includes(form.subcategoria) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5">
                      <Allegati files={form.files} onChange={(v) => update("files", v)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Sezione>

            <div className="space-y-4">
            {/* Doppione */}
            <AnimatePresence>
              {doppione && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl border border-amber-300 bg-amber-50 p-4"
                >
                  <p className="font-semibold text-amber-900">Possibile doppione</p>
                  {doppione.locale && (
                    <p className="text-sm text-amber-800 mt-1">
                      Da questo dispositivo, nelle ultime 24 ore, è partito un intervento {doppione.locale.tipo} per {doppione.locale.condominio}
                      {" "}(<span className="font-mono font-semibold">{doppione.locale.ticket}</span>).
                    </p>
                  )}
                  {doppione.remoti?.length > 0 && (
                    <p className="text-sm text-amber-800 mt-1">
                      Negli ultimi 14 giorni c'è già {doppione.remoti.length === 1 ? "una segnalazione" : `${doppione.remoti.length} segnalazioni`} dello stesso tipo e con descrizione simile su questo condominio:{" "}
                      {doppione.remoti.map((x) => `${x.ticket} del ${x.data}`).join(", ")}.
                    </p>
                  )}
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button type="button" onClick={() => submit(true)}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700">
                      È un problema diverso, invia
                    </button>
                    <button type="button" onClick={() => setDoppione(null)}
                      className="px-4 py-2 rounded-xl bg-white ring-1 ring-neutral-300 text-sm font-semibold hover:bg-neutral-50">
                      Annulla
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Riepilogo form={form} />

            {/* Invio */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                disabled={sending}
                onClick={() => submit()}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold text-base transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8B1538]/30",
                  sending ? "bg-neutral-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-deep)] shadow-lg hover:shadow-xl"
                )}
              >
                {sending ? <><Loader2 className="w-5 h-5 animate-spin" />Invio in corso…</> : <><Send className="w-5 h-5" />Apri intervento</>}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => { setForm(formVuoto(form.operatore)); setDescrVerifica(""); setTouched({}); setDoppione(null); setRifNonInviato(null); }}
                className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white ring-1 ring-neutral-300 text-neutral-700 font-semibold text-sm hover:bg-neutral-50"
              >
                <RotateCcw className="w-4 h-4" /> Svuota modulo
              </button>
            </div>
            </div>
          </div>
        </div>

        <UltimiInvii invii={invii} onRicarica={ricaricaNonInviato} onElimina={eliminaVoce} />
      </main>

      <footer className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-8 text-xs text-neutral-500 flex flex-col sm:flex-row justify-between gap-1">
        <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-[var(--brand)]" />© {new Date().getFullYear()} Studio CAI</span>
        <span className="tabular-nums">v{APP_VERSION} – aggiornata il {BUILD_DATE_LABEL}</span>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sotto-componenti
// ─────────────────────────────────────────────────────────────
function UltimiInvii({ invii, onRicarica, onElimina }) {
  if (!invii.length) return null;
  return (
    <section className="mt-6 bg-white rounded-3xl ring-1 ring-neutral-200/80 shadow-soft p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--brand)]" /> Ultimi interventi da questo dispositivo
        </h2>
      </div>
      <p className="text-xs text-neutral-500 mt-0.5">Elenco locale, a solo scopo di riscontro. Non sostituisce il registro dello studio.</p>

      <ul className="mt-3 divide-y divide-neutral-100">
        {invii.map((v) => {
          const ok = v.stato === "inviato";
          const tipo = TIPI_INTERVENTO.find((t) => t.value === v.tipo);
          const Icona = tipo?.icon || Wrench;
          const luogo = [v.condominio, v.scala && `sc. ${v.scala}`, v.interno && `int. ${v.interno}`].filter(Boolean).join(", ");
          return (
            <li key={v.id} className="py-3 flex items-start gap-3">
              <span className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                ok ? "bg-[#8B1538]/10 text-[var(--brand)]" : "bg-amber-100 text-amber-700"
              )}>
                <Icona className="w-[18px] h-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{tipo?.label || v.tipo} – {luogo}</p>
                <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap gap-x-2">
                  <span>{quando(v.ts)}</span>
                  <span>{v.operatore}</span>
                  {v.ticket && <span className="font-mono text-neutral-700 select-all">{v.ticket}</span>}
                  {v.allegati > 0 && <span>{v.allegati} allegat{v.allegati === 1 ? "o" : "i"}</span>}
                  {v.conferma === "inviata" && <span className="text-emerald-700">conferma inviata</span>}
                  {v.conferma === "non_inviata" && <span className="text-amber-700">conferma non partita</span>}
                </p>
                {!ok && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => onRicarica(v)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">
                      Ricarica nel modulo
                    </button>
                    <button type="button" onClick={() => onElimina(v.id)}
                      className="px-3 py-1.5 rounded-lg ring-1 ring-neutral-300 text-neutral-600 text-xs font-semibold hover:bg-neutral-50">
                      Elimina
                    </button>
                  </div>
                )}
              </div>
              <span className={cn(
                "flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
              )}>
                {ok ? "Inviato" : "Non inviato"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PannelloVerifica({ verifica }) {
  const [aperto, setAperto] = useState(false);
  if (verifica.stato === "vuoto") return null;
  if (verifica.stato === "carico") {
    return (
      <p className="mt-4 text-xs text-neutral-500 flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {verifica.conDescr ? "Confronto la descrizione con le segnalazioni recenti dello stesso tipo…" : "Controllo segnalazioni recenti dello stesso tipo su questo condominio…"}
      </p>
    );
  }
  if (verifica.stato === "errore") {
    return (
      <p className="mt-4 text-xs text-neutral-500 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" /> Controllo doppioni non disponibile ora: l'intervento si può inviare comunque.
      </p>
    );
  }
  const stesso = verifica.trovati.filter((x) => x.livello === "alta");
  const altri = verifica.trovati.filter((x) => x.livello !== "alta");
  if (!verifica.trovati.length) {
    return (
      <p className="mt-4 text-xs text-emerald-700 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> {verifica.conDescr ? "Nessuna segnalazione simile negli ultimi 14 giorni." : "Nessuna segnalazione dello stesso tipo negli ultimi 14 giorni."}
      </p>
    );
  }
  const Voce = ({ x }) => (
    <li className="py-2 text-xs">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-mono font-semibold text-neutral-800">{x.ticket}</span>
        <span className="text-neutral-500">{x.data}</span>
        <span className="font-semibold">{x.tipo}</span>
        <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-semibold",
          x.origine === "studio" ? "bg-[#8B1538]/10 text-[var(--brand)]" : "bg-sky-50 text-sky-700")}>
          {x.origine === "studio" ? "portale interno" : "app condomini"}
        </span>
      </p>
      <p className="text-neutral-600 mt-0.5">
        {[x.condominio, x.scala && `sc. ${x.scala}`, x.interno && `int. ${x.interno}`].filter(Boolean).join(", ")}
        {x.nome && <span className="text-neutral-500"> – {x.nome}</span>}
      </p>
      {x.estratto && <p className="text-neutral-500 mt-0.5 line-clamp-2">{x.estratto}</p>}
    </li>
  );
  return (
    <div className={cn("mt-4 rounded-xl px-3.5 py-2.5 ring-1",
      stesso.length ? "bg-amber-50 ring-amber-300" : "bg-neutral-50 ring-neutral-200")}>
      {stesso.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <Copy className="w-4 h-4" /> {verifica.conDescr
              ? <>Possibile doppione: {stesso.length === 1 ? "problema simile già segnalato" : `problema simile già segnalato ${stesso.length} volte`} negli ultimi 14 giorni</>
              : <>Stesso tipo già segnalato su questo condominio negli ultimi 14 giorni</>}
          </p>
          {!verifica.conDescr && <p className="text-xs text-amber-800 mt-0.5">Scrivi la descrizione: il controllo verifica se si tratta dello stesso problema.</p>}
          <ul className="divide-y divide-amber-200/70">{stesso.map((x) => <Voce key={x.ticket + x.data} x={x} />)}</ul>
        </>
      ) : (
        <p className="text-xs text-neutral-600 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Nessun doppione dello stesso tipo. Ci sono altre segnalazioni recenti sul condominio.
        </p>
      )}
      {altri.length > 0 && (
        <div className={cn(stesso.length && "mt-1.5 pt-1.5 border-t border-amber-200/70")}>
          <button type="button" onClick={() => setAperto((a) => !a)}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 text-left">
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", aperto && "rotate-180")} />
            {aperto ? "Nascondi" : "Mostra"} {altri.length === 1 ? "l'altra segnalazione" : `le altre ${altri.length} segnalazioni`} sul condominio
          </button>
          {aperto && <ul className="divide-y divide-neutral-200">{altri.map((x) => <Voce key={x.ticket + x.data} x={x} />)}</ul>}
        </div>
      )}
    </div>
  );
}

function Orologio() {
  const [ora, setOra] = useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setOra(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const giorno = ora.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const data = giorno.charAt(0).toUpperCase() + giorno.slice(1); // "Giovedì 17 settembre 2026"
  const orario = ora.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
      <p className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{data}</p>
      <p className="inline-flex items-center gap-2 text-[var(--brand)]" aria-live="off">
        <Clock className="w-5 h-5" />
        <span className="font-mono font-bold text-2xl sm:text-3xl tabular-nums">{orario}</span>
      </p>
    </div>
  );
}

function Riepilogo({ form }) {
  const luogo = [form.condominio, form.scala && `sc. ${form.scala}`, form.interno && `int. ${form.interno}`]
    .filter(Boolean).join(", ");
  const contatto = [form.refNome, form.refTelefono].filter(Boolean).join(" ");
  const tipo = TIPI_INTERVENTO.find((t) => t.value === form.subcategoria)?.label;
  const allegati = TIPI_CON_ALLEGATI.includes(form.subcategoria) ? (form.files || []).length : 0;
  const descr = form.messaggio.trim();

  const voci = [
    ["Da", form.operatore],
    ["Condominio", luogo],
    ["Tipo", tipo],
    ["Contatto", contatto],
    ["Allegati", allegati ? `${allegati}` : ""],
  ].filter(([, v]) => v);

  return (
    <div className="rounded-xl bg-neutral-50 ring-1 ring-neutral-200 px-3.5 py-2.5 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-neutral-700">
        <ClipboardList className="w-3.5 h-3.5 text-[var(--brand)]" /> Riepilogo
      </p>
      {voci.length ? (
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-neutral-600">
          {voci.map(([k, v]) => (
            <span key={k}>{k}: <span className="font-semibold text-neutral-900">{v}</span></span>
          ))}
        </p>
      ) : (
        <p className="mt-1 text-neutral-400">Compila il modulo per vedere il riepilogo.</p>
      )}
      {descr && (
        <p className="mt-1 text-neutral-500 truncate" title={descr}>{descr}</p>
      )}
    </div>
  );
}

function Logo() {
  const [ko, setKo] = useState(false);
  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white ring-1 ring-neutral-200 shadow-soft flex items-center justify-center">
      {ko ? <span className="font-display font-bold text-lg tracking-[0.06em] text-[var(--brand)]">CAI</span>
          : <img src="/logo.jpg" alt="Studio CAI" className="w-full h-full object-contain p-1" onError={() => setKo(true)} />}
    </div>
  );
}

function Sezione({ n, icon, title, required, facoltativo, children }) {
  return (
    <section>
      <header className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-[#8B1538]/10 text-[var(--brand)] ring-1 ring-[#8B1538]/15 flex items-center justify-center flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          {n && <span className="font-display text-sm text-[#8B1538]/60 tabular-nums">{n}.</span>}
          <h3 className="font-display font-semibold text-lg leading-tight">
            {title}{required && <span className="text-red-500 font-sans text-sm ml-1">*</span>}
          </h3>
          {facoltativo && <span className="text-xs text-neutral-500">facoltativo</span>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Errore({ testo, inline }) {
  return (
    <p className={cn("text-xs text-red-600 flex items-center gap-1", !inline && "mt-1.5")}>
      <AlertCircle className="w-3 h-3" />{testo}
    </p>
  );
}

function Campo({ label, value, onChange, onBlur, placeholder, type = "text", icon, required, error, list, inputMode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1 mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">{icon}</span>}
        <input
          type={type}
          value={value}
          list={list}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-2xl border py-3 text-sm focus:outline-none focus:ring-2 bg-white placeholder:text-neutral-400",
            icon ? "pl-10 pr-4" : "px-4",
            error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                  : "border-neutral-300 hover:border-neutral-400 focus:ring-[#8B1538]/20 focus:border-[var(--brand)]"
          )}
        />
      </div>
      {error && <Errore testo={error} />}
    </div>
  );
}

function TendinaCondominio({ value, elenco, stato, messaggioErrore, onRiprova, onChange, error }) {
  const [aperta, setAperta] = useState(false);
  const [q, setQ] = useState("");
  const [attivo, setAttivo] = useState(0);
  const box = React.useRef(null);
  const listaRef = React.useRef(null);

  const filtrati = useMemo(() => {
    const n = normalizza(q);
    return n ? elenco.filter((c) => normalizza(c).includes(n)) : elenco;
  }, [q, elenco]);

  React.useEffect(() => { setAttivo(0); }, [q, aperta]);
  React.useEffect(() => {
    if (!aperta) return;
    const fuori = (e) => { if (box.current && !box.current.contains(e.target)) setAperta(false); };
    document.addEventListener("mousedown", fuori);
    document.addEventListener("touchstart", fuori);
    return () => { document.removeEventListener("mousedown", fuori); document.removeEventListener("touchstart", fuori); };
  }, [aperta]);
  React.useEffect(() => {
    const el = listaRef.current?.children?.[attivo];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [attivo]);

  const scegli = (c) => { onChange(c); setAperta(false); setQ(""); };
  const tasti = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAttivo((i) => Math.min(i + 1, filtrati.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAttivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtrati[attivo]) scegli(filtrati[attivo]); }
    else if (e.key === "Escape") { setAperta(false); }
  };

  const senzaElenco = !elenco.length;

  return (
    <div ref={box} className="relative">
      <p className="text-sm font-semibold text-neutral-700 flex items-center gap-1 mb-1.5">
        Condominio<span className="text-red-500">*</span>
        <span className="ml-auto font-normal text-xs text-neutral-500">
          {stato === "caricamento" ? "aggiornamento elenco…" : elenco.length ? `${elenco.length} condomini` : ""}
        </span>
      </p>
      <button
        type="button"
        disabled={senzaElenco}
        aria-haspopup="listbox"
        aria-expanded={aperta}
        onClick={() => setAperta((a) => !a)}
        className={cn(
          "w-full flex items-center gap-2 rounded-2xl border pl-3.5 pr-3 py-3 text-sm text-left bg-white focus:outline-none focus:ring-2",
          error ? "border-red-300 focus:ring-red-500/20" : "border-neutral-300 hover:border-neutral-400 focus:ring-[#8B1538]/20 focus:border-[var(--brand)]",
          senzaElenco && "bg-neutral-50 cursor-not-allowed"
        )}
      >
        <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <span className={cn("flex-1 truncate", value ? "text-neutral-900 font-medium" : "text-neutral-400")}>
          {value || (senzaElenco ? (stato === "caricamento" ? "Carico l'elenco condomini…" : "Elenco non disponibile") : "Scegli il condominio")}
        </span>
        {stato === "caricamento" && senzaElenco
          ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
          : <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", aperta && "rotate-180")} />}
      </button>

      {aperta && (
        <div className="absolute z-30 mt-1.5 w-full rounded-2xl bg-white ring-1 ring-neutral-200 shadow-lift overflow-hidden">
          <div className="p-2 border-b border-neutral-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="search"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={tasti}
                placeholder="Cerca la via, es. rua"
                className="w-full rounded-xl bg-neutral-50 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B1538]/20"
              />
            </div>
          </div>
          <ul ref={listaRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {filtrati.map((c, i) => (
              <li key={c} role="option" aria-selected={c === value}>
                <button
                  type="button"
                  onMouseEnter={() => setAttivo(i)}
                  onClick={() => scegli(c)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm text-left",
                    i === attivo ? "bg-[#8B1538]/[0.12]" : "",
                    c === value ? "font-semibold text-[var(--brand)]" : "text-neutral-800"
                  )}
                >
                  {c}
                  {c === value && <Check className="w-4 h-4" />}
                </button>
              </li>
            ))}
            {!filtrati.length && <li className="px-4 py-4 text-sm text-neutral-500">Nessun condominio contiene “{q}”.</li>}
          </ul>
        </div>
      )}

      {stato === "errore" && (
        <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          {senzaElenco ? messaggioErrore : "Elenco non aggiornato: uso l'ultima copia salvata."}
          <button type="button" onClick={onRiprova} className="font-semibold underline">Riprova</button>
        </p>
      )}
      {error && <Errore testo={error} />}
    </div>
  );
}

function Allegati({ files = [], onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const pieno = files.length >= MAX_FILE;

  const aggiungi = (nuovi) => {
    const lista = [...files];
    Array.from(nuovi || []).forEach((f) => {
      const gia = lista.some((x) => x.name === f.name && x.size === f.size);
      if (!gia && lista.length < MAX_FILE) lista.push(f);
    });
    onChange(lista);
  };

  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5 mb-1.5">
        <Paperclip className="w-4 h-4" /> Foto o documenti <span className="font-normal text-neutral-500">(facoltativo)</span>
      </p>

      {files.length > 0 && (
        <ul className="space-y-2 mb-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 p-2.5 bg-[#8B1538]/5 border border-[#8B1538]/20 rounded-xl">
              <Paperclip className="w-4 h-4 text-[var(--brand)] flex-shrink-0" />
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{f.name}</span>
              <span className="text-xs text-neutral-500 tabular-nums">{(f.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600" aria-label={`Rimuovi ${f.name}`}>
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pieno ? (
        <p className="text-xs text-neutral-500">Limite di {MAX_FILE} file raggiunto.</p>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); aggiungi(e.dataTransfer?.files); }}
          className={cn(
            "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-colors text-center px-4",
            dragOver ? "border-[var(--brand)] bg-[#8B1538]/10" : "border-neutral-300 hover:border-[var(--brand)] hover:bg-[#8B1538]/5"
          )}
        >
          <span className="text-sm font-semibold text-neutral-700">{files.length ? "Aggiungi un altro file" : "Clicca o trascina qui i file"}</span>
          <span className="text-xs text-neutral-500 mt-0.5">PDF, JPG o PNG, max {MAX_MB} MB ciascuno, fino a {MAX_FILE} file</span>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => { aggiungi(e.target.files); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}
