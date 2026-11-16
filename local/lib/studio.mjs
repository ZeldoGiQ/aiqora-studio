// Studio-Ordner, Projekte und Dashboard.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import {
  Fehler, VORLAGE_ORDNER, SKILLS_ORDNER, PLUGIN_ROOT, heute, imStudio, kurzname, studioOrdner
} from "./pfade.mjs";

export function version() {
  try { return JSON.parse(readFileSync(path.join(PLUGIN_ROOT, ".claude-plugin", "plugin.json"), "utf8")).version || "0.0.0"; }
  catch { return "0.0.0"; }
}

export function istEingerichtet() {
  const s = studioOrdner();
  return existsSync(path.join(s, "CLAUDE.md")) && existsSync(path.join(s, "projekte"));
}

// Dateien, die zum Produkt gehören und bei jedem Einrichten aktualisiert werden.
const PRODUKT_DATEIEN = ["CLAUDE.md", "AGENTS.md", "dashboard.html"];
// Dateien des Nutzers: nur anlegen, nie überschreiben.
const NUTZER_DATEIEN = ["regeln.md", "daten.js"];

export function einrichten() {
  const s = studioOrdner();
  for (const d of [s, path.join(s, "projekte"), path.join(s, "figuren"), path.join(s, "downloads")]) {
    mkdirSync(d, { recursive: true });
  }
  const angelegt = [], aktualisiert = [];
  for (const name of PRODUKT_DATEIEN) {
    const ziel = path.join(s, name);
    const vorher = existsSync(ziel) ? readFileSync(ziel, "utf8") : null;
    let inhalt = readFileSync(path.join(VORLAGE_ORDNER, name), "utf8");
    if (name === "AGENTS.md") inhalt = inhalt.replaceAll("{{AIQORA_STUDIO_SKILLS}}", SKILLS_ORDNER.replaceAll("\\", "/"));
    if (vorher !== inhalt) {
      writeFileSync(ziel, inhalt, "utf8");
      (vorher === null ? angelegt : aktualisiert).push(name);
    }
  }
  for (const name of NUTZER_DATEIEN) {
    const ziel = path.join(s, name);
    if (!existsSync(ziel)) { copyFileSync(path.join(VORLAGE_ORDNER, name), ziel); angelegt.push(name); }
  }
  writeFileSync(path.join(s, ".studio-version"), version() + "\n", "utf8");
  return { studio_ordner: s, angelegt, aktualisiert };
}

function pruefeEingerichtet() {
  if (!istEingerichtet()) throw new Fehler("Das Studio ist noch nicht eingerichtet. Bitte zuerst studio_einrichten aufrufen.");
}

export function projektAnlegen(name) {
  pruefeEingerichtet();
  if (typeof name !== "string" || !name.trim()) throw new Fehler("Bitte einen Projektnamen angeben.");
  const ordnerName = `${heute()}-${kurzname(name)}`;
  const ordner = imStudio(path.join("projekte", ordnerName));
  const neu = !existsSync(ordner);
  for (const u of ["bilder", "clips", "audio", "fertig"]) mkdirSync(path.join(ordner, u), { recursive: true });
  const notizen = path.join(ordner, "notizen.md");
  if (!existsSync(notizen)) {
    writeFileSync(notizen, `# ${name.trim()}\n\nAngelegt: ${heute()}\n\n## Idee\n\n## Aufträge und Kosten\n\n## Notizen\n`, "utf8");
  }
  return { projekt: ordnerName, ordner, neu };
}

export function projekteListe() {
  pruefeEingerichtet();
  const basis = path.join(studioOrdner(), "projekte");
  return readdirSync(basis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const ordner = path.join(basis, e.name);
      const fertig = path.join(ordner, "fertig");
      const anzahl = existsSync(fertig) ? readdirSync(fertig).length : 0;
      return { projekt: e.name, ordner, fertige_dateien: anzahl, geaendert: statSync(ordner).mtime.toISOString() };
    })
    .sort((a, b) => b.geaendert.localeCompare(a.geaendert));
}

/** Pfad im Projekt (projekt = Ordnername aus projekt_anlegen). */
export function projektPfad(projekt, unterordner = "") {
  if (typeof projekt !== "string" || !projekt.trim()) throw new Fehler("Bitte ein Projekt angeben.");
  const ordner = imStudio(path.join("projekte", path.basename(projekt), unterordner ? path.basename(unterordner) : ""));
  if (!existsSync(imStudio(path.join("projekte", path.basename(projekt))))) {
    throw new Fehler(`Das Projekt "${projekt}" gibt es nicht. Erst projekt_anlegen aufrufen.`);
  }
  mkdirSync(ordner, { recursive: true });
  return ordner;
}

// ---------- Dashboard ----------

const PRAEFIX = "window.AIQORA_DATA = ";
const LISTEN = ["jobs", "projekte", "modelle"];
const TEXTE = ["reichtFuer", "tipp"];
const MAX_EINTRAEGE = 50;

export function dashboardLesen() {
  const datei = path.join(studioOrdner(), "daten.js");
  try {
    const roh = readFileSync(datei, "utf8").trim();
    const json = roh.slice(roh.indexOf("{"), roh.lastIndexOf("}") + 1);
    return JSON.parse(json);
  } catch {
    return { aktualisiert: "", credits: null, reichtFuer: "", tipp: "", jobs: [], projekte: [], modelle: [] };
  }
}

function sauberText(v, max = 300) {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, max);
}

function sauberEintrag(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  const out = {};
  for (const [k, v] of Object.entries(e).slice(0, 10)) {
    if (!/^[a-zA-Z_]{1,20}$/.test(k)) continue;
    out[k] = typeof v === "number" ? v : sauberText(v);
  }
  return out;
}

export function dashboardAktualisieren(neu = {}) {
  pruefeEingerichtet();
  const d = dashboardLesen();
  if (neu.credits !== undefined) {
    if (neu.credits !== null && typeof neu.credits !== "number") throw new Fehler("credits muss eine Zahl sein.");
    d.credits = neu.credits;
  }
  for (const t of TEXTE) if (neu[t] !== undefined) d[t] = sauberText(neu[t]);
  for (const l of LISTEN) {
    if (neu[l] === undefined) continue;
    if (!Array.isArray(neu[l])) throw new Fehler(`${l} muss eine Liste sein.`);
    d[l] = neu[l].map(sauberEintrag).filter(Boolean).slice(0, MAX_EINTRAEGE);
  }
  d.aktualisiert = new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  const datei = path.join(studioOrdner(), "daten.js");
  writeFileSync(datei, PRAEFIX + JSON.stringify(d, null, 2) + ";\n", "utf8");
  return { datei, daten: d };
}
