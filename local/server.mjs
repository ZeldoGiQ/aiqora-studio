#!/usr/bin/env node
// AIQORA Studio – lokaler Helfer.
// Ein MCP-Server (stdio, JSON-RPC 2.0, eine Nachricht pro Zeile) ohne externe Abhängigkeiten.
// Er verwaltet Dateien und Projekte, macht einfache Schnitte und hält eigene Anbieter-Schlüssel (BYOK) lokal.
// Er enthält bewusst keine Abläufe und kein Prompt-Wissen: das liegt auf dem AIQORA-Server.
import { Fehler } from "./lib/pfade.mjs";
import { protokoll, starten, unbekannt } from "./lib/stdio.mjs";
import { version } from "./lib/studio.mjs";
import { WERKZEUGE, pruefeEingaben } from "./lib/werkzeuge.mjs";

const NAME = "aiqora-local";

const ANLEITUNG =
  "Lokaler Helfer des AIQORA Studios: Projektordner, Herunter- und Hochladen (nur zu AIQORA), " +
  "einfache Schnitte mit ffmpeg, Dashboard und eigene Anbieter-Schlüssel (BYOK). " +
  "Erzeugt wird über den AIQORA-Server, nicht hier.";

function log(...teile) {
  // Nur nach stderr. Nie Eingaben oder Umgebungswerte loggen.
  process.stderr.write(`[${NAME}] ${teile.join(" ")}\n`);
}

function text(obj) {
  return typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

async function werkzeugAufrufen(params) {
  const w = WERKZEUGE.find((x) => x.name === params?.name);
  if (!w) return { content: [{ type: "text", text: `Unbekanntes Werkzeug: ${params?.name}` }], isError: true };
  try {
    const args = pruefeEingaben(w.inputSchema, params.arguments);
    const ergebnis = await w.run(args);
    return { content: [{ type: "text", text: text(ergebnis) }] };
  } catch (e) {
    const meldung = e instanceof Fehler ? e.message : "Unerwarteter Fehler im lokalen Helfer.";
    if (!(e instanceof Fehler)) log("Fehler in", w.name + ":", e?.stack || String(e));
    return { content: [{ type: "text", text: meldung }], isError: true };
  }
}

export async function bearbeiten(nachricht) {
  const { id, method, params } = nachricht || {};
  const istAnfrage = id !== undefined && id !== null;
  switch (method) {
    case "initialize": {
      return {
        protocolVersion: protokoll(params?.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: NAME, version: version() },
        instructions: ANLEITUNG
      };
    }
    case "ping":
      return {};
    case "tools/list":
      return { tools: WERKZEUGE.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
    case "tools/call":
      return werkzeugAufrufen(params);
    default:
      if (!istAnfrage || String(method || "").startsWith("notifications/")) return undefined;
      throw unbekannt(method);
  }
}

starten(bearbeiten);
