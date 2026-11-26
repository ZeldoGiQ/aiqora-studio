// Womit wurde eine Datei erzeugt, und was hat sie gekostet?
// Pro Projekt hält die Datei erzeugt.json fest: Datei → Modell, Kosten, Auftrag. Geschrieben wird beim Herunterladen
// eines Ergebnisses (datei_herunterladen mit modell und credits), gelesen von der Oberfläche (Galerie, Projektkosten).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as modelle from "./modelle.mjs";

export const DATEI = "erzeugt.json";
const MAX_EINTRAEGE = 2000;

const sauber = (v, max = 120) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

/** Alle Einträge eines Projekts: { "bilder/katze.png": { modell, modell_name, credits, auftrag, zeit } }. */
export function lesen(projektOrdner) {
  try {
    const daten = JSON.parse(readFileSync(path.join(projektOrdner, DATEI), "utf8"));
    return daten && typeof daten === "object" && !Array.isArray(daten) ? daten : {};
  } catch {
    return {};
  }
}

/**
 * Hält zu einer Datei im Projekt fest, womit sie erzeugt wurde. Ohne Modell, Kosten und Auftrag passiert nichts.
 * Der Anzeigename des Modells kommt aus dem gespeicherten Modellkatalog, falls das Modell dort steht.
 */
export function merken(projektOrdner, dateiPfad, { modell, credits, auftrag } = {}) {
  const eintrag = {};
  if (sauber(modell)) {
    eintrag.modell = sauber(modell);
    eintrag.modell_name = modelle.finden(eintrag.modell)?.name || eintrag.modell;
  }
  if (typeof credits === "number" && Number.isFinite(credits) && credits >= 0) eintrag.credits = credits;
  if (sauber(auftrag)) eintrag.auftrag = sauber(auftrag);
  if (!Object.keys(eintrag).length) return null;
  eintrag.zeit = new Date().toISOString();

  const rel = path.relative(projektOrdner, dateiPfad).split(path.sep).join("/");
  const alle = lesen(projektOrdner);
  alle[rel] = eintrag;
  // Einträge zu gelöschten Dateien entfernen, damit die Datei nicht endlos wächst.
  for (const k of Object.keys(alle)) if (!existsSync(path.join(projektOrdner, k))) delete alle[k];
  const behalten = Object.entries(alle).sort((a, b) => String(b[1].zeit).localeCompare(String(a[1].zeit))).slice(0, MAX_EINTRAEGE);
  writeFileSync(path.join(projektOrdner, DATEI), JSON.stringify(Object.fromEntries(behalten), null, 2) + "\n", "utf8");
  return eintrag;
}

/** Summe der festgehaltenen Kosten eines Projekts. Kosten desselben Auftrags zählen nur einmal. */
export function summe(eintraege) {
  const gesehen = new Set();
  let gesamt = 0;
  for (const e of Object.values(eintraege)) {
    if (typeof e.credits !== "number") continue;
    if (e.auftrag) { if (gesehen.has(e.auftrag)) continue; gesehen.add(e.auftrag); }
    gesamt += e.credits;
  }
  return Math.round(gesamt * 100) / 100;
}
