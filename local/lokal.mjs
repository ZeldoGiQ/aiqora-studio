#!/usr/bin/env node
// AIQORA Studio – mit einem lokalen Modell starten (Ollama, LM Studio oder llama.cpp).
// Sucht ein lokales Modell auf diesem Rechner und öffnet Claude Code im Studio-Ordner so, dass es dieses Modell
// statt Claude benutzt. Bilder, Videos und Musik kommen weiter von AIQORA und kosten weiter Guthaben.
//   --pruefen           nur zeigen, was gefunden wurde (JSON), nichts starten
//   --neu               Modell neu auswählen, auch wenn eins gemerkt ist
//   --anbieter <name>   ollama, lmstudio oder llamacpp
//   --modell <name>     dieses Modell nehmen
//   -- <weitere>        alles danach geht unverändert an Claude Code
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import {
  ANBIETER, MIN_KONTEXT, auswahlLesen, auswahlSpeichern, claudeArgumente, erkennen, serverStarten, startProgramm,
  ueberschriebenVonEinstellungen, umgebungFuerClaude, vorbereiten
} from "./lib/lokal.mjs";
import { studioOrdner } from "./lib/pfade.mjs";
import { einrichten, istEingerichtet } from "./lib/studio.mjs";

const argv = process.argv.slice(2);
const trenner = argv.indexOf("--");
const eigene = trenner < 0 ? argv : argv.slice(0, trenner);
const weiter = trenner < 0 ? [] : argv.slice(trenner + 1);
const wert = (name) => { const i = eigene.indexOf(name); return i >= 0 ? eigene[i + 1] || "" : ""; };
const sag = (text = "") => process.stdout.write(text + "\n");

function ende(text) {
  sag("\n" + text);
  process.exit(1);
}

/** Alle Modelle aller laufenden Server als flache Liste. */
function kandidaten(status) {
  return status.filter((s) => s.laeuft).flatMap((s) => s.modelle.map((m) => ({ status: s, eintrag: m })));
}

async function fragen(liste) {
  sag("\nWelches Modell soll das Studio benutzen?\n");
  liste.forEach((k, i) => sag(`  ${i + 1}  ${k.eintrag.name}  (${ANBIETER[k.status.anbieter].titel})`));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const nr = Number((await rl.question("\nZahl eintippen und Enter drücken: ")).trim());
      if (Number.isInteger(nr) && nr >= 1 && nr <= liste.length) return liste[nr - 1];
    }
  } finally {
    rl.close();
  }
}

async function status() {
  let s = await erkennen();
  if (!eigene.includes("--pruefen") && !s.some((x) => x.laeuft)) {
    // Nichts läuft: einen installierten Anbieter selbst starten, den gemerkten zuerst.
    const reihenfolge = [auswahlLesen()?.anbieter, wert("--anbieter"), "ollama", "lmstudio"].filter((a, i, alle) => a && alle.indexOf(a) === i);
    for (const a of reihenfolge) {
      if (!(await startProgramm(a))) continue;
      sag(`${ANBIETER[a].titel} wird gestartet …`);
      if (await serverStarten(a)) break;
    }
    s = await erkennen();
  }
  return s;
}

const s = await status();

if (eigene.includes("--pruefen")) {
  const installiert = Object.fromEntries(await Promise.all(Object.keys(ANBIETER).map(async (a) => [a, Boolean(await startProgramm(a))])));
  sag(JSON.stringify({
    anbieter: s.map((x) => ({
      anbieter: x.anbieter, titel: ANBIETER[x.anbieter].titel, installiert: installiert[x.anbieter] || x.laeuft,
      laeuft: x.laeuft, modelle: x.modelle.map((m) => m.name)
    })),
    gemerkt: auswahlLesen(),
    mindest_textfenster: MIN_KONTEXT
  }, null, 2));
  process.exit(0);
}

let liste = kandidaten(s);
if (wert("--anbieter")) liste = liste.filter((k) => k.status.anbieter === wert("--anbieter"));
if (wert("--modell")) liste = liste.filter((k) => k.eintrag.name === wert("--modell"));

if (!liste.length) {
  const laufend = s.filter((x) => x.laeuft).map((x) => ANBIETER[x.anbieter].titel);
  ende(laufend.length
    ? `${laufend.join(" und ")} läuft, aber es ist noch kein passendes Modell geladen.\n` +
      "Lade zuerst ein Modell, das mit Werkzeugen umgehen kann, zum Beispiel in Ollama: ollama pull qwen3-coder"
    : "Es wurde kein lokales Modell gefunden.\n" +
      "Installiere Ollama (https://ollama.com/download) oder LM Studio (https://lmstudio.ai), lade dort ein Modell\n" +
      "und starte dann diesen Knopf noch einmal. llama.cpp musst du vorher selbst mit deinem Modell starten.");
}

const gemerkt = eigene.includes("--neu") ? null : auswahlLesen();
let wahl = gemerkt && liste.find((k) => k.status.anbieter === gemerkt.anbieter && k.eintrag.name === gemerkt.modell);
if (!wahl) wahl = liste.length === 1 ? liste[0] : await fragen(liste);
auswahlSpeichern(wahl.status.anbieter, wahl.eintrag.name);

const titel = ANBIETER[wahl.status.anbieter].titel;
sag(`\nDas Studio startet mit ${wahl.eintrag.name} (${titel}). Das Modell wird vorbereitet …`);
let bereit;
try {
  bereit = await vorbereiten(wahl.status, wahl.eintrag);
} catch {
  ende(`Das Modell konnte in ${titel} nicht vorbereitet werden. Ist ${titel} aktuell und läuft es noch?`);
}
if (!/^[A-Za-z0-9._:/@+-]+$/.test(bereit.modell)) ende("Der Name des Modells enthält Zeichen, mit denen das Studio nicht starten kann.");

if (bereit.kontext && bereit.kontext < MIN_KONTEXT) {
  sag(`\nAchtung: Das Modell ist nur mit ${bereit.kontext} Tokens Textfenster geladen. Das Studio braucht mindestens ${MIN_KONTEXT}.`);
  sag("Mit so wenig vergisst das Modell mitten im Auftrag die Regeln. Lade es mit größerem Textfenster neu.");
}
const stoert = ueberschriebenVonEinstellungen();
if (stoert.length) {
  sag(`\nAchtung: In deinen Claude-Einstellungen (settings.json, Abschnitt „env“) steht ${stoert.join(", ")}.`);
  sag("Diese Einträge gewinnen gegen den lokalen Start. Nimm sie dort heraus, wenn Claude Code das lokale Modell nicht benutzt.");
}

if (!istEingerichtet()) einrichten();
sag("\nBilder, Videos und Musik kommen weiter von AIQORA und kosten Guthaben.");
sag("Vor jedem Auftrag, der Guthaben kostet, fragt das Studio hier nach.\n");

// Über die Shell starten, weil „claude“ unter Windows eine .cmd-Datei ist. Der Modellname ist oben geprüft.
const zusatz = [...claudeArgumente(), ...weiter]
  .map((a) => (/^[A-Za-z0-9._:/@=+,-]+$/.test(a) ? a : `"${a.replaceAll('"', "")}"`)).join(" ");
const kind = spawn(`claude --model ${bereit.modell} ${zusatz}`.trim(), {
  shell: true, stdio: "inherit", cwd: studioOrdner(),
  env: { ...process.env, ...umgebungFuerClaude(wahl.status.basis, bereit.modell, bereit.kontext) }
});
kind.on("error", () => ende("Claude Code konnte nicht gestartet werden. Ist es installiert? https://claude.com/claude-code"));
kind.on("exit", (code) => {
  if (code === 127 || code === 9009) ende("Claude Code wurde nicht gefunden. Bitte zuerst installieren: https://claude.com/claude-code");
  process.exit(code ?? 0);
});
