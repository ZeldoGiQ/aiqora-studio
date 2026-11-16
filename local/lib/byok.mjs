// Eigene Anbieter-Schlüssel (BYOK).
// Grundsätze:
//  - Schlüssel kommen nur aus dem sicheren Speicher von Claude Code (als Umgebungsvariable an diesen Prozess).
//  - Sie werden nie zurückgegeben, nie geloggt, nie an AIQORA geschickt.
//  - Aufrufe gehen direkt vom Rechner des Nutzers zum Anbieter.
//  - Freischaltung nur mit gültigem Abo-Nachweis von AIQORA (weiche Sperre, siehe README).
import { Fehler, umgebung } from "./pfade.mjs";

export const ANBIETER = {
  wavespeed: { name: "WaveSpeed", variable: "AIQORA_BYOK_WAVESPEED", kann: ["bild", "clip"] },
  fal: { name: "fal", variable: "AIQORA_BYOK_FAL", kann: ["bild", "clip"] },
  elevenlabs: { name: "ElevenLabs", variable: "AIQORA_BYOK_ELEVENLABS", kann: ["stimme"] }
};

function schluessel(id) {
  const a = ANBIETER[id];
  return a ? umgebung(a.variable) : "";
}

export function status() {
  return {
    anbieter: Object.entries(ANBIETER).map(([id, a]) => ({
      id, name: a.name, eingetragen: Boolean(schluessel(id)), kann: a.kann
    })),
    hinweis: "Eigene Schlüssel bleiben auf diesem Rechner und gehen nie an AIQORA. Eintragen oder ändern: /plugin → AIQORA Studio → Einstellungen."
  };
}

/**
 * Prüft den Abo-Nachweis, den der AIQORA-Server ausstellt.
 * TODO (Phase 4): signiertes Token mit kurzer Laufzeit, Prüfung gegen den öffentlichen Schlüssel von AIQORA.
 */
export function aboPruefen(nachweis) {
  if (!nachweis) throw new Fehler("Eigene Schlüssel brauchen ein AIQORA-Abo. Bitte den Abo-Nachweis vom AIQORA-Server mitgeben.");
  throw new Fehler("Die Abo-Prüfung für eigene Schlüssel kommt in einer späteren Version.");
}

/**
 * Einheitliche Schnittstelle für alle Anbieter.
 * art: "bild" | "clip" | "stimme"
 * Gibt { url } oder { datei } zurück. Der Prompt des Nutzers geht unverändert an den Anbieter.
 * TODO (Phase 4): Adapter je Anbieter.
 */
export async function erzeugen({ art, anbieter, prompt, abo_nachweis }) {
  if (!["bild", "clip", "stimme"].includes(art)) throw new Fehler("Unbekannte Art.");
  const passende = Object.entries(ANBIETER).filter(([, a]) => a.kann.includes(art)).map(([id]) => id);
  const id = anbieter || passende.find((p) => schluessel(p));
  if (!id || !ANBIETER[id]) throw new Fehler(`Für „${art}“ ist kein eigener Schlüssel eingetragen. Ohne eigenen Schlüssel geht es über AIQORA-Credits.`);
  if (!ANBIETER[id].kann.includes(art)) throw new Fehler(`${ANBIETER[id].name} kann keine Art „${art}“.`);
  if (!schluessel(id)) throw new Fehler(`Für ${ANBIETER[id].name} ist kein Schlüssel eingetragen.`);
  if (typeof prompt !== "string" || !prompt.trim()) throw new Fehler("Bitte beschreiben, was erzeugt werden soll.");
  aboPruefen(abo_nachweis);
  throw new Fehler("Erzeugen mit eigenem Schlüssel kommt in einer späteren Version. Bis dahin geht es über AIQORA-Credits.");
}
