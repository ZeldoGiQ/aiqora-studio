// Der Starter der Oberfläche: Nach einem Update muss eine noch laufende alte Oberfläche ersetzt werden.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT } from "./hilfen.mjs";

const STARTER = path.join(ROOT, "local", "oberflaeche.mjs");
const VERSION = JSON.parse(readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8")).version;

function umgebung(port) {
  const basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-starter-"));
  return {
    ...process.env, AIQORA_APP_DATEN: path.join(basis, "app"), AIQORA_STUDIO_ORDNER: path.join(basis, "Studio"),
    AIQORA_STUDIO_PORT: String(port), AIQORA_SCHLUESSEL_ART: "datei", AIQORA_KEIN_REGISTRY: "1", AIQORA_API_KEY: ""
  };
}

const starten = (env) => new Promise((resolve) => {
  execFile(process.execPath, [STARTER, "--kein-browser"], { env, timeout: 30000 }, (err, stdout) => {
    let ergebnis = null;
    try { ergebnis = JSON.parse(String(stdout).trim().split("\n").pop()); } catch { /* unten */ }
    resolve(ergebnis || { ok: false, fehler: String(err) });
  });
});

const sitzung = (env) => JSON.parse(readFileSync(path.join(env.AIQORA_APP_DATEN, "oberflaeche.json"), "utf8"));
const ping = async (port) => (await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: AbortSignal.timeout(2000) })).json();
const beenden = (pid) => { try { process.kill(pid); } catch { /* schon weg */ } };
const lebt = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

/** Eine „alte“ Oberfläche als eigenes Programm: antwortet auf den Ping mit der angegebenen Version (oder ohne). */
function alteOberflaeche(version) {
  const code = `
    const http = require("node:http");
    const antwort = JSON.stringify(${JSON.stringify(version === null ? { app: "aiqora-studio" } : { app: "aiqora-studio", version })});
    const s = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(antwort); });
    s.listen(0, "127.0.0.1", () => process.stdout.write(String(s.address().port) + "\\n"));`;
  return new Promise((resolve) => {
    const kind = spawn(process.execPath, ["-e", code], { stdio: ["ignore", "pipe", "ignore"] });
    kind.stdout.once("data", (d) => resolve({ kind, port: Number(String(d).trim()) }));
  });
}

test("eine Oberfläche mit altem Stand wird beim Öffnen durch die neue ersetzt", async () => {
  for (const alteVersion of [null, "0.0.1"]) { // ohne Versionsangabe: Oberflächen bis 0.5.0
    const alt = await alteOberflaeche(alteVersion);
    const env = umgebung(alt.port);
    mkdirSync(env.AIQORA_APP_DATEN, { recursive: true });
    writeFileSync(path.join(env.AIQORA_APP_DATEN, "oberflaeche.json"), JSON.stringify({ port: alt.port, token: "x".repeat(43), pid: alt.kind.pid }));
    let neu;
    try {
      const r = await starten(env);
      assert.equal(r.ok, true, r.fehler);
      neu = sitzung(env);
      assert.notEqual(neu.pid, alt.kind.pid, "es läuft eine neue Oberfläche");
      assert.equal(lebt(alt.kind.pid), false, "die alte ist beendet");
      assert.deepEqual(await ping(neu.port), { app: "aiqora-studio", version: VERSION });
      assert.equal(r.adresse, `http://127.0.0.1:${neu.port}`);
    } finally {
      beenden(alt.kind.pid);
      if (neu) beenden(neu.pid);
    }
  }
});

test("eine Oberfläche mit aktuellem Stand läuft weiter", async () => {
  const env = umgebung(41000 + Math.floor(Math.random() * 2000)); // weit weg vom Port eines echten Studios
  let erste;
  try {
    assert.equal((await starten(env)).ok, true);
    erste = sitzung(env);
    assert.equal((await starten(env)).ok, true);
    assert.deepEqual(sitzung(env), erste, "zweites Öffnen nimmt dieselbe Oberfläche, die Sitzung bleibt gültig");
  } finally {
    if (erste) beenden(erste.pid);
  }
});
