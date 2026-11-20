// Der AIQORA-Schlüssel: eine Stelle für Oberfläche, lokalen Helfer und Claude Code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-schluessel-"));
const UMGEBUNG = {
  AIQORA_APP_DATEN: path.join(basis, "app"),
  AIQORA_SCHLUESSEL_ART: "datei",
  AIQORA_KEIN_REGISTRY: "1"
};
Object.assign(process.env, UMGEBUNG);
delete process.env.AIQORA_API_KEY;
delete process.env.AIQORA_SCHLUESSEL_VOM_PLUGIN;

const schluessel = await import("../local/lib/schluessel.mjs");
const kopfzeilen = fileURLToPath(new URL("../local/kopfzeilen.mjs", import.meta.url));
const PLUGIN = "aiq_plugin_" + "p".repeat(24);
const APP = "aiq_app_" + "a".repeat(24);

function helfer(extra = {}) {
  // Wie Claude Code: Variablen mit KEY im Namen bekommt der Helfer nicht.
  const env = Object.fromEntries(Object.entries({ ...process.env, ...extra }).filter(([k]) => !/key/i.test(k)));
  return JSON.parse(execFileSync(process.execPath, [kopfzeilen], { env, encoding: "utf8" }));
}

test("ohne Schlüssel: nichts gefunden, Helfer gibt leeres Objekt", async () => {
  assert.deepEqual(await schluessel.finden(), { wert: "", quelle: null });
  assert.deepEqual(helfer(), {});
});

test("unausgefüllte Plugin-Einstellung zählt nicht als Schlüssel", async () => {
  process.env.AIQORA_API_KEY = "${user_config.aiqora_api_key}";
  process.env.AIQORA_SCHLUESSEL_VOM_PLUGIN = "1";
  assert.equal((await schluessel.finden()).wert, "");
});

test("Plugin-Schlüssel gilt, solange in der App keiner gespeichert ist", async () => {
  process.env.AIQORA_API_KEY = PLUGIN;
  assert.deepEqual(await schluessel.finden(), { wert: PLUGIN, quelle: "plugin" });
});

test("in der App gespeicherter Schlüssel gewinnt, auch für Claude Code", async () => {
  await schluessel.speichern(APP);
  assert.deepEqual(await schluessel.finden(), { wert: APP, quelle: "gespeichert" });
  assert.deepEqual(helfer(), { Authorization: `Bearer ${APP}` });
  await schluessel.loeschen();
  assert.deepEqual(helfer(), {});
});
