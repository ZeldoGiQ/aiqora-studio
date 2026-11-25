#!/usr/bin/env node
// AIQORA Studio – Brücke zum AIQORA-Server.
// Für Programme, die das Studio nicht als Claude-Code-Plugin laden (Codex, Antigravity und andere mit MCP).
// Ein MCP-Server über stdio, der die Werkzeugliste und alle Aufrufe an den AIQORA-Server weiterreicht.
// Den Schlüssel holt er aus dem Studio (lib/schluessel.mjs). Er steht also in keiner Einstellungsdatei
// des Programms, und der Nutzer trägt ihn nur an einer Stelle ein: im Studio im Browser.
//   --kompakt   Sparmodus für lokale Modelle mit kleinem Textfenster: statt aller AIQORA-Werkzeuge (zusammen
//               rund 30.000 Tokens) zeigt die Brücke nur drei: Liste, Beschreibung eines Werkzeugs, Aufruf.
import { erstelleClient, SchluesselFehler } from "./lib/aiqora.mjs";
import { Fehler } from "./lib/pfade.mjs";
import * as schluessel from "./lib/schluessel.mjs";
import { protokoll, senden, starten, unbekannt } from "./lib/stdio.mjs";
import { version } from "./lib/studio.mjs";

const NAME = "aiqora";
const ANMELDEN = "aiqora_anmelden";
const KOMPAKT = process.argv.includes("--kompakt") || process.env.AIQORA_BRUECKE_KOMPAKT === "1";
const LISTE = "aiqora_werkzeuge", BESCHREIBUNG = "aiqora_beschreibung", AUFRUF = "aiqora_aufruf";

const ANLEITUNG =
  "AIQORA: Bilder, Videos, Musik, Musikvideos und Filme erzeugen. Kostet AIQORA-Credits; vor jedem Auftrag " +
  "die Kosten nennen. Gibt es nur das Werkzeug aiqora_anmelden, fehlt der AIQORA-Schlüssel: dann dieses Werkzeug aufrufen." +
  (KOMPAKT
    ? ` Die AIQORA-Werkzeuge erreichst du in drei Schritten: ${LISTE} zeigt alle Namen, ${BESCHREIBUNG} erklärt eins ` +
      `mit seinen Eingaben, ${AUFRUF} führt es aus. Wo eine Anleitung ein Werkzeug aiqora_… nennt, rufe es über ${AUFRUF} auf.`
    : "");

const SCHLUESSEL_FEHLT =
  "Der AIQORA-Schlüssel fehlt oder ist ungültig. Sag dem Nutzer: Öffne das AIQORA Studio im Browser " +
  "(Knopf „AIQORA Studio“ auf dem Desktop), trage unter „Einstellungen“ deinen AIQORA-Schlüssel ein " +
  "(zu finden unter https://aiqora.ai/settings bei „MCP API Keys“) und starte dieses Programm danach neu. " +
  "Den Schlüssel nie im Chat erfragen oder annehmen.";

const aiqora = erstelleClient(async () => (await schluessel.finden()).wert, {
  name: "aiqora-studio-bruecke",
  zeitlimitMs: 5 * 60 * 1000
});

const textErgebnis = (text, isError = false) => ({ content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) });

/** Antwort von AIQORA auspacken: Ergebnis liefern oder den Fehler mit seinem Code weiterwerfen. */
function auspacken(antwort) {
  if (antwort?.error) {
    throw Object.assign(new Error(String(antwort.error.message || "Fehler bei AIQORA").slice(0, 500)), { rpcCode: antwort.error.code });
  }
  return antwort?.result ?? {};
}

let ohneSchluessel = false;

// ---------- Sparmodus ----------

const leer = { type: "object", properties: {}, additionalProperties: false };
const KOMPAKT_WERKZEUGE = [
  {
    name: LISTE,
    description: "Listet alle AIQORA-Werkzeuge mit einer kurzen Beschreibung. Mit 'suche' nur die passenden (z. B. 'musik', 'video', 'figur').",
    inputSchema: { type: "object", properties: { suche: { type: "string", description: "Wort, nach dem gefiltert wird (optional)" } }, additionalProperties: false }
  },
  {
    name: BESCHREIBUNG,
    description: `Zeigt die volle Beschreibung und die Eingaben eines AIQORA-Werkzeugs. Vor dem ersten ${AUFRUF} eines Werkzeugs aufrufen.`,
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Name aus aiqora_werkzeuge" } }, required: ["name"], additionalProperties: false }
  },
  {
    name: AUFRUF,
    description: "Ruft ein AIQORA-Werkzeug auf. Viele Werkzeuge kosten Guthaben: vorher die Kosten nennen.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name aus aiqora_werkzeuge" },
        eingaben: { type: "object", description: "Eingaben, wie aiqora_beschreibung sie nennt (optional)" }
      },
      required: ["name"], additionalProperties: false
    }
  }
];

let alleWerkzeuge = null;
async function alle() {
  if (!alleWerkzeuge) alleWerkzeuge = auspacken(await aiqora.weiterleiten("tools/list", {})).tools || [];
  return alleWerkzeuge;
}

/** Erster Satz der Beschreibung, höchstens 160 Zeichen. */
function kurz(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const satz = t.match(/^.*?[.!?](?=\s|$)/)?.[0] || t;
  return satz.length > 160 ? satz.slice(0, 157) + "…" : satz;
}

async function kompaktAufrufen(params) {
  const a = params?.arguments ?? {};
  if (params.name === LISTE) {
    const suche = String(a.suche || "").toLowerCase();
    const treffer = (await alle()).filter((w) => !suche || `${w.name} ${w.description}`.toLowerCase().includes(suche));
    return textErgebnis(treffer.map((w) => `${w.name}: ${kurz(w.description)}`).join("\n") || "Kein Werkzeug passt zu dieser Suche.");
  }
  const w = (await alle()).find((x) => x.name === a.name);
  if (!w) return textErgebnis(`Das Werkzeug „${a.name}“ gibt es nicht. ${LISTE} zeigt alle Namen.`, true);
  if (params.name === BESCHREIBUNG) return textErgebnis(JSON.stringify({ name: w.name, beschreibung: w.description, eingaben: w.inputSchema }));
  return auspacken(await aiqora.weiterleiten("tools/call", { name: w.name, arguments: a.eingaben ?? {} }));
}

// ---------- Anfragen ----------

async function werkzeugliste(params) {
  try {
    if (KOMPAKT) { await alle(); ohneSchluessel = false; return { tools: KOMPAKT_WERKZEUGE }; }
    const liste = auspacken(await aiqora.weiterleiten("tools/list", params ?? {}));
    ohneSchluessel = false;
    return liste;
  } catch (e) {
    if (!(e instanceof SchluesselFehler)) throw e;
    ohneSchluessel = true;
    return {
      tools: [{
        name: ANMELDEN,
        description: "Der AIQORA-Schlüssel fehlt oder ist ungültig. Aufrufen, um zu erfahren, was der Nutzer tun muss.",
        inputSchema: leer
      }]
    };
  }
}

async function anmelden() {
  try {
    auspacken(await aiqora.weiterleiten("tools/list", {}));
  } catch (e) {
    return textErgebnis(e instanceof SchluesselFehler ? SCHLUESSEL_FEHLT : e.message, true);
  }
  // Der Schlüssel ist inzwischen da: Programme, die das unterstützen, laden die Werkzeugliste neu.
  if (ohneSchluessel) { ohneSchluessel = false; senden({ jsonrpc: "2.0", method: "notifications/tools/list_changed" }); }
  return textErgebnis("Der AIQORA-Schlüssel ist eingetragen und gültig. Fehlen die AIQORA-Werkzeuge noch, muss der Nutzer dieses Programm einmal neu starten.");
}

async function werkzeugAufrufen(params) {
  if (params?.name === ANMELDEN) return anmelden();
  try {
    if (KOMPAKT && [LISTE, BESCHREIBUNG, AUFRUF].includes(params?.name)) return await kompaktAufrufen(params);
    return auspacken(await aiqora.weiterleiten("tools/call", params));
  } catch (e) {
    if (e instanceof SchluesselFehler) return textErgebnis(SCHLUESSEL_FEHLT, true);
    if (e instanceof Fehler) return textErgebnis(e.message, true);
    throw e;
  }
}

export async function bearbeiten(nachricht) {
  const { id, method, params } = nachricht || {};
  const istAnfrage = id !== undefined && id !== null;
  switch (method) {
    case "initialize":
      return {
        protocolVersion: protokoll(params?.protocolVersion),
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: NAME, version: version() },
        instructions: ANLEITUNG
      };
    case "ping":
      return {};
    case "tools/list":
      return werkzeugliste(params);
    case "tools/call":
      return werkzeugAufrufen(params);
    default:
      if (!istAnfrage || String(method || "").startsWith("notifications/")) return undefined;
      throw unbekannt(method);
  }
}

starten(bearbeiten);
