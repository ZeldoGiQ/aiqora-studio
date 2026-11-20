#!/usr/bin/env node
// Gibt Claude Code die Anmeldung für den AIQORA-Server (als "headersHelper" in .mcp.json).
// Nimmt denselben Schlüssel wie die Studio-Oberfläche: in der App gespeichert, sonst die Umgebungsvariable
// des Systems. Findet sich keiner, kommt ein leeres Objekt zurück; dann gilt der Schlüssel aus den
// Plugin-Einstellungen. Ausgabe nur auf stdout an Claude Code, nie ins Terminal oder in ein Protokoll.
import { finden } from "./lib/schluessel.mjs";

let wert = "";
try { ({ wert } = await finden()); } catch { /* kein Schlüssel: Plugin-Einstellung gilt */ }
process.stdout.write(JSON.stringify(wert ? { Authorization: `Bearer ${wert}` } : {}));
