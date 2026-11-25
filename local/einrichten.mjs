#!/usr/bin/env node
// AIQORA Studio – in einem weiteren Programm einrichten.
//   node local/einrichten.mjs codex         OpenAI Codex (CLI, IDE-Erweiterung und App teilen sich die Einstellungen)
//   node local/einrichten.mjs antigravity   Google Antigravity (App, IDE und agy)
//   node local/einrichten.mjs lokal         Desktop-Knopf „AIQORA Studio (lokal)“ für Ollama, LM Studio, llama.cpp
//   node local/einrichten.mjs status        zeigen, welche Programme gefunden wurden
// Mit --ersetzen werden auch eigene, gleichnamige Einträge des Nutzers überschrieben (vorher wird gesichert).
// Die Ausgabe ist JSON. Sie enthält nie einen Schlüssel.
import * as addons from "./lib/addons.mjs";
import { erkennen } from "./lib/lokal.mjs";
import { Fehler } from "./lib/pfade.mjs";
import * as programme from "./lib/programme.mjs";
import * as studio from "./lib/studio.mjs";

const [ziel, ...rest] = process.argv.slice(2);
const ersetzen = rest.includes("--ersetzen");

async function ausfuehren() {
  switch (ziel) {
    case "codex":
    case "antigravity": {
      const angaben = { ersetzen, zusatz: await addons.verbindungen() };
      const ergebnis = ziel === "codex" ? programme.codexEinrichten(angaben) : programme.antigravityEinrichten(angaben);
      return { ...ergebnis, studio_ordner: studio.einrichten().studio_ordner, knopf: programme.studioKnopfAnlegen() };
    }
    case "lokal":
      return { knopf: programme.lokalKnopfAnlegen(), lokale_modelle: await lokaleModelle(), studio_ordner: studio.einrichten().studio_ordner };
    case "status":
      return { programme: programme.gefunden(), lokale_modelle: await lokaleModelle(), programm_ordner: programme.programmOrdner() };
    default:
      throw new Fehler("Bitte angeben: codex, antigravity, lokal oder status.");
  }
}

async function lokaleModelle() {
  return (await erkennen()).map((s) => ({ anbieter: s.anbieter, laeuft: s.laeuft, modelle: s.modelle.map((m) => m.name) }));
}

try {
  process.stdout.write(JSON.stringify({ ok: true, ...(await ausfuehren()) }, null, 2) + "\n");
} catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, fehler: e instanceof Fehler ? e.message : `Das Einrichten ist fehlgeschlagen: ${e.message}` }) + "\n");
  process.exit(1);
}
