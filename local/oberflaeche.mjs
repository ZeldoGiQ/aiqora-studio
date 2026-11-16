#!/usr/bin/env node
// AIQORA Studio – Oberfläche starten.
// Ohne Angabe: prüft, ob das Studio schon läuft, startet es sonst unsichtbar im Hintergrund und öffnet den Browser.
//   --dienst        läuft selbst als Server (wird vom Starter im Hintergrund aufgerufen)
//   --kein-browser  öffnet keinen Browser (für Tests und den Aufruf aus Claude Code)
import { spawn, execFile } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appDatenOrdner, umgebung } from "./lib/pfade.mjs";
import { erstelleClient } from "./lib/aiqora.mjs";
import { erstelleServer } from "./lib/oberflaeche.mjs";
import * as schluessel from "./lib/schluessel.mjs";

const STANDARD_PORT = 4471;
const LEERLAUF_MS = 4 * 60 * 60 * 1000; // nach 4 Stunden ohne Zugriff beendet sich der Server
const argv = process.argv.slice(2);
const sitzungsDatei = () => path.join(appDatenOrdner(), "oberflaeche.json");

function sitzungLesen() {
  try { return JSON.parse(readFileSync(sitzungsDatei(), "utf8")); } catch { return null; }
}

async function laeuft(s) {
  if (!s?.port) return false;
  try {
    const r = await fetch(`http://127.0.0.1:${s.port}/api/ping`, { signal: AbortSignal.timeout(1500) });
    return r.ok && (await r.json()).app === "aiqora-studio";
  } catch {
    return false;
  }
}

function browserOeffnen(url) {
  const [cmd, args] = process.platform === "win32" ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const kind = execFile(cmd, args, { windowsHide: true }, () => {});
  kind.unref();
}

const einstieg = (s) => `http://127.0.0.1:${s.port}/start?t=${s.token}`;

// ---------- Dienst: der eigentliche Server ----------

async function dienst() {
  const token = randomBytes(32).toString("base64url");
  const aiqora = erstelleClient(async () => (await schluessel.finden()).wert);
  let letzterZugriff = Date.now();
  const server = erstelleServer({ token, aiqora, beimZugriff: () => { letzterZugriff = Date.now(); } });

  const wunsch = Number(umgebung("AIQORA_STUDIO_PORT")) || STANDARD_PORT;
  const kandidaten = [...Array.from({ length: 10 }, (_, i) => wunsch + i), 0];
  for (const port of kandidaten) {
    const ok = await new Promise((resolve) => {
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => resolve(true));
    });
    if (ok) break;
  }
  const port = server.address()?.port;
  if (!port) { process.stderr.write("Das Studio konnte keinen freien Port finden.\n"); process.exit(1); }

  mkdirSync(appDatenOrdner(), { recursive: true });
  writeFileSync(sitzungsDatei(), JSON.stringify({ port, token, pid: process.pid }), { mode: 0o600 });

  const aufraeumen = () => {
    try { if (sitzungLesen()?.pid === process.pid) unlinkSync(sitzungsDatei()); } catch { /* egal */ }
    process.exit(0);
  };
  process.on("SIGINT", aufraeumen);
  process.on("SIGTERM", aufraeumen);
  setInterval(() => { if (Date.now() - letzterZugriff > LEERLAUF_MS) aufraeumen(); }, 60000).unref();

  process.stdout.write(`AIQORA Studio läuft auf http://127.0.0.1:${port}\n`);
}

// ---------- Starter ----------

async function starter() {
  let s = sitzungLesen();
  if (!(await laeuft(s))) {
    const kind = spawn(process.execPath, [fileURLToPath(import.meta.url), "--dienst"], {
      detached: true, stdio: "ignore", windowsHide: true, env: process.env
    });
    kind.unref();
    s = null;
    for (let i = 0; i < 50 && !s; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const kandidat = sitzungLesen();
      if (kandidat?.pid === kind.pid && (await laeuft(kandidat))) s = kandidat;
    }
    if (!s) {
      process.stdout.write(JSON.stringify({ ok: false, fehler: "Das Studio konnte nicht gestartet werden." }) + "\n");
      process.exit(1);
    }
  }
  if (!argv.includes("--kein-browser")) browserOeffnen(einstieg(s));
  // Ausgabe ohne Kennwort: für Claude Code und das Terminal.
  process.stdout.write(JSON.stringify({ ok: true, adresse: `http://127.0.0.1:${s.port}` }) + "\n");
}

if (argv.includes("--dienst")) await dienst();
else await starter();
