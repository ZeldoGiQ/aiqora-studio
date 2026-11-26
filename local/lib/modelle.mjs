// Der Modellkatalog: welche Modelle AIQORA anbietet, was sie können und was sie kosten.
// Eine Quelle für beide Seiten: die Oberfläche (/api/modelle) und die Assistenten (Werkzeug modelle_liste).
// Alle Angaben kommen vom AIQORA-Server (aiqora_list_models). Im Code steht kein Preis und kein Modell fest:
// Ändert AIQORA Preise oder Modelle, zeigt das Studio sie nach spätestens zehn Minuten.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Fehler, appDatenOrdner } from "./pfade.mjs";

const FRISCH_MS = 10 * 60 * 1000;

export const ARTEN = {
  video: { titel: "Video", mehrzahl: "Videomodelle" },
  bild: { titel: "Bild", mehrzahl: "Bildmodelle" },
  musik: { titel: "Musik", mehrzahl: "Musikmodelle" },
  stimme: { titel: "Stimme", mehrzahl: "Stimmenmodelle" },
  lipsync: { titel: "Lippensynchron", mehrzahl: "Modelle für Lippensynchron" }
};
const BEREICH_ZU_ART = { video: "video", image: "bild", music: "musik", tts: "stimme" };

const runden = (n) => Math.round(n * 100) / 100;
const zahlen = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => Number.isFinite(Number(v))).map(([k, v]) => [k, Number(v)]));
const texte = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === "string" || typeof x === "number").map(String).slice(0, 40) : []);

/** Preiseinheit von AIQORA in einfaches Deutsch, z. B. "per 6s clip (base resolution)" → "pro Clip mit 6 Sekunden". */
const sekunden = (n) => `${n} ${Number(n) === 1 ? "Sekunde" : "Sekunden"}`;

export function einheit(text) {
  const t = String(text || "").trim();
  let m;
  if ((m = /^per (\d+)\s*s clip/i.exec(t))) return `pro Clip mit ${sekunden(m[1])}`;
  if (/^per clip/i.test(t)) return "pro Clip";
  if ((m = /^per image(?: \((.+)\))?/i.exec(t))) return m[1] ? `pro Bild (${m[1]})` : "pro Bild";
  if (/^per generation/i.test(t)) return "pro Erzeugung";
  if (/^per minute of speech/i.test(t)) return "pro Minute Sprache";
  if ((m = /^per (\d+)\s*s scene/i.exec(t))) return `pro Szene mit ${sekunden(m[1])}`;
  if ((m = /^per second of audio(?: \((.+)\))?/i.exec(t))) return m[1] ? `pro Sekunde Ton (${m[1]})` : "pro Sekunde Ton";
  return t.replace(/^per /i, "pro ");
}

/**
 * Preis eines Clips nach der Regel von AIQORA (mit kostenlosen Preisabfragen nachgeprüft):
 * Preis je Dauer × Faktor der Auflösung. Beim Faktor 1 gilt der Preis genau, sonst wird auf ganze Credits aufgerundet.
 */
export function clipPreis(basis, faktor = 1) {
  return faktor === 1 ? runden(basis) : Math.ceil(basis * faktor - 1e-6);
}

/** Preistabelle eines Videomodells: je Dauer der Preis pro Auflösung, mit Ton zusätzlich der Aufschlag für diese Dauer. */
function videoTabelle(m) {
  const nachDauer = zahlen(m.creditsByDuration);
  const faktoren = zahlen(m.resolutionMultipliers);
  const ton = zahlen(m.soundCreditsExtra);
  const aufloesungen = Object.keys(faktoren).length ? Object.keys(faktoren) : texte(m.resolutions).slice(0, 1);
  return Object.keys(nachDauer).sort((a, b) => Number(a) - Number(b)).map((dauer) => ({
    dauer: Number(dauer),
    preise: Object.fromEntries((aufloesungen.length ? aufloesungen : [""]).map((a) => [a, clipPreis(nachDauer[dauer], faktoren[a] ?? 1)])),
    tonAufschlag: ton[dauer] ?? null
  }));
}

function modell(roh, art) {
  if (!roh || typeof roh.id !== "string" || !roh.id) return null;
  const m = {
    id: roh.id,
    name: String(roh.displayName || roh.id),
    art,
    aliase: texte(roh.aliases),
    credits: null,
    einheit: einheit(roh.creditsUnit),
    kann: [],
    dauer: texte(roh.durations).map(Number).filter(Number.isFinite),
    aufloesungen: texte(roh.resolutions),
    formate: texte(roh.aspectRatios),
    preise: null
  };
  if (typeof roh.credits === "number") m.credits = roh.credits;
  else if (typeof roh.credits === "string") { // Lippensynchron: "9 per 5 s scene"
    const t = /^([\d.]+)\s*(.*)$/.exec(roh.credits.trim());
    if (t) { m.credits = Number(t[1]); m.einheit = einheit(t[2].replace(/(\d)\s+s\b/, "$1s")); }
  }
  const kann = [
    [roh.supportsSound, "Ton"], [roh.supportsImageInput, "Bild als Vorlage"], [roh.supportsEndFrame, "Start- und Endbild"],
    [roh.supportsAudioReference, "Ton als Vorlage"], [roh.supportsLipsync, "Lippensynchron"], [roh.supportsDraft, "Entwurf"]
  ];
  m.kann = kann.filter(([an]) => an === true).map(([, text]) => text);
  if (Number(roh.maxReferenceImages) > 1) m.kann.push(`bis ${Number(roh.maxReferenceImages)} Vorlagenbilder`);

  if (art === "video") {
    const tabelle = videoTabelle(roh);
    if (tabelle.length) m.preise = { nachDauer: tabelle };
  } else if (art === "bild" && roh.resolutionCredits) {
    m.preise = { nachAufloesung: zahlen(roh.resolutionCredits) };
  } else if (art === "lipsync") {
    if (roh.audio?.exactSeconds) m.kann.push(`Ton genau ${sekunden(roh.audio.exactSeconds)}`);
    if (roh.audio?.maxSeconds) m.kann.push(`Ton bis ${sekunden(roh.audio.maxSeconds)}`);
    if (roh.default === true) m.standard = true;
  }
  const alle = [
    ...(m.preise?.nachDauer || []).flatMap((z) => Object.values(z.preise).flatMap((p) => [p, p + (z.tonAufschlag || 0)])),
    ...Object.values(m.preise?.nachAufloesung || {}),
    ...(m.credits === null ? [] : [m.credits])
  ];
  m.preisVon = alle.length ? Math.min(...alle) : null;
  m.preisBis = alle.length ? Math.max(...alle) : null;
  // Bei Videos gilt der kleinste Preis für die kürzeste Dauer in der kleinsten Auflösung: die Einheit dazu passend nennen.
  const kuerzeste = m.preise?.nachDauer?.[0];
  if (kuerzeste && m.preisVon !== null) m.einheit = `pro Clip mit ${sekunden(kuerzeste.dauer)}`;
  return m;
}

/** Macht aus der Antwort von aiqora_list_models den Katalog des Studios. */
export function normalisieren(roh) {
  const arten = Object.fromEntries(Object.keys(ARTEN).map((a) => [a, []]));
  for (const [bereich, liste] of Object.entries(roh?.domains || {})) {
    const art = BEREICH_ZU_ART[bereich];
    if (!art || !Array.isArray(liste)) continue;
    arten[art] = liste.map((m) => modell(m, art)).filter(Boolean);
  }
  arten.lipsync = (Array.isArray(roh?.lipsyncModels) ? roh.lipsyncModels : []).map((m) => modell(m, "lipsync")).filter(Boolean);
  for (const liste of Object.values(arten)) liste.sort((a, b) => (a.preisVon ?? Infinity) - (b.preisVon ?? Infinity) || a.name.localeCompare(b.name));
  return arten;
}

// ---------- Laden, mit Zwischenspeicher ----------

const speicherDatei = () => path.join(appDatenOrdner(), "modelle.json");
let imSpeicher = null; // { stand, arten }

/**
 * Der zuletzt geladene Katalog (ohne Netz), oder null. Auf der Platte liegt die Antwort von AIQORA, wie sie kam;
 * aufbereitet wird sie erst beim Lesen. So passt ein gespeicherter Stand auch nach einem Update des Studios.
 */
export function ausSpeicher() {
  if (imSpeicher) return imSpeicher;
  try {
    const k = JSON.parse(readFileSync(speicherDatei(), "utf8"));
    if (!k?.roh || !Date.parse(k.stand)) return null;
    imSpeicher = { stand: k.stand, arten: normalisieren(k.roh) };
    return imSpeicher;
  } catch {
    return null;
  }
}

/**
 * Der Katalog: { stand, veraltet, arten: { video: [...], bild: [...], … } }.
 * Älter als zehn Minuten (oder mit frisch): neu von AIQORA holen. Ist AIQORA nicht erreichbar, kommt der zuletzt
 * gespeicherte Stand mit veraltet: true, damit die Übersicht auch ohne Netz etwas zeigt.
 */
export async function katalog(aiqora, { frisch = false } = {}) {
  const alt = ausSpeicher();
  if (alt && !frisch && Date.now() - Date.parse(alt.stand) < FRISCH_MS) return { ...alt, veraltet: false };
  try {
    const roh = await aiqora.aufrufen("aiqora_list_models", {});
    const arten = normalisieren(roh);
    if (!Object.values(arten).some((l) => l.length)) throw new Fehler("AIQORA hat keine Modelle geliefert.");
    imSpeicher = { stand: new Date().toISOString(), arten };
    try {
      mkdirSync(appDatenOrdner(), { recursive: true });
      writeFileSync(speicherDatei(), JSON.stringify({ stand: imSpeicher.stand, roh: { domains: roh.domains, lipsyncModels: roh.lipsyncModels } }) + "\n", "utf8");
    } catch { /* ohne Platte geht es auch */ }
    return { ...imSpeicher, veraltet: false };
  } catch (e) {
    if (alt) return { ...alt, veraltet: true };
    throw e;
  }
}

/** Nur für Tests: vergisst den Katalog im Arbeitsspeicher. */
export function vergessen() {
  imSpeicher = null;
}

// ---------- Suchen und für Assistenten kurz fassen ----------

const gleich = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/** Findet ein Modell über Kennung, Namen oder Alias im gespeicherten Katalog (ohne Netz). */
export function finden(kennung, kat = ausSpeicher()) {
  if (!kennung || !kat) return null;
  for (const liste of Object.values(kat.arten)) {
    const m = liste.find((x) => gleich(x.id, kennung) || gleich(x.name, kennung) || x.aliase.some((a) => gleich(a, kennung)));
    if (m) return m;
  }
  return null;
}

/** Modelle einer Art (oder aller), optional gefiltert nach einem Suchwort in Name, Kennung oder Fähigkeiten. */
export function filtern(kat, { art, suche } = {}) {
  if (art && !ARTEN[art]) throw new Fehler(`Diese Art gibt es nicht. Möglich sind: ${Object.keys(ARTEN).join(", ")}.`);
  const wort = String(suche || "").trim().toLowerCase();
  const liste = (art ? kat.arten[art] : Object.values(kat.arten).flat()) || [];
  return wort ? liste.filter((m) => `${m.id} ${m.name} ${m.aliase.join(" ")} ${m.kann.join(" ")}`.toLowerCase().includes(wort)) : liste;
}

const deutsch = (n) => String(n).replace(".", ",");
const spanne = (liste, endung = "") => (liste.length > 4 ? `${liste[0]}${endung} bis ${liste[liste.length - 1]}${endung}` : liste.map((x) => x + endung).join(", "));

export function preisText(m) {
  if (m.preisVon === null) return "Preis auf Anfrage";
  const ab = m.preisBis > m.preisVon ? "ab " : "";
  return `${ab}${deutsch(m.preisVon)} Credits ${m.einheit}`.trim();
}

/** Eine Zeile je Modell, für die Antwort eines Assistenten. */
export function kurz(m) {
  const teile = [`${m.name} (${m.id}): ${preisText(m)}`];
  if (m.preisBis > m.preisVon) teile.push(`bis ${deutsch(m.preisBis)} Credits`);
  if (m.dauer.length) teile.push(`Dauer ${spanne(m.dauer, " s")}`);
  if (m.aufloesungen.length) teile.push(m.aufloesungen.join(", "));
  if (m.kann.length) teile.push(`kann: ${m.kann.join(", ")}`);
  return teile.join("; ");
}
