#!/usr/bin/env node
// AIQORA Studio – feste Kostenfrage für lokale Modelle.
// Claude Code ruft dieses Skript vor jedem AIQORA-Werkzeug auf (hooks/hooks.json).
// Läuft das Studio mit einem lokalen Modell (AIQORA_LOKALES_MODELL=1, gesetzt von local/lokal.mjs), muss der
// Nutzer jeden Auftrag bestätigen, der Guthaben kosten oder etwas löschen kann. Kleine Modelle halten sich
// schlechter an die Regeln des Studios; die Frage hängt deshalb nicht vom Modell ab.
// Mit Claude selbst tut das Skript nichts.
import { kostetOderLoescht } from "./lib/kosten.mjs";

if (process.env.AIQORA_LOKALES_MODELL !== "1") process.exit(0);

let eingabe = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { eingabe += d; });
process.stdin.on("end", () => {
  let aufruf = {};
  try { aufruf = JSON.parse(eingabe) || {}; } catch { /* ohne Angaben: nichts tun */ }
  if (!kostetOderLoescht(aufruf.tool_name, aufruf.tool_input)) process.exit(0);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "Dieser Auftrag kann Guthaben kosten oder etwas löschen. Mit einem lokalen Modell fragt das Studio hier immer nach."
    }
  }));
});
