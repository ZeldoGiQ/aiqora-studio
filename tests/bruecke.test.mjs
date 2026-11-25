// Die Brücke: reicht Werkzeuge des AIQORA-Servers an Programme ohne Plugin durch (gegen einen Ersatz-Server).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { starteHelfer } from "./hilfen.mjs";

const SCHLUESSEL = "aiq_test_" + "b".repeat(30);
const WERKZEUGE = [
  { name: "aiqora_whoami", description: "Zeigt das Konto. Kostet nichts.", inputSchema: { type: "object", properties: {} } },
  { name: "aiqora_generation_music", description: "Erzeugt einen Song. Kostet Guthaben. Zweiter Satz.", inputSchema: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] } }
];
const aufrufe = [];

const ersatz = http.createServer((req, res) => {
  let koerper = "";
  req.on("data", (d) => { koerper += d; });
  req.on("end", () => {
    if (req.headers.authorization !== `Bearer ${SCHLUESSEL}`) { res.writeHead(401); res.end(); return; }
    const m = JSON.parse(koerper);
    const antworten = (result) => { res.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "s-1" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result })); };
    if (m.method === "initialize") return antworten({ protocolVersion: "2025-06-18", capabilities: {} });
    if (!m.id) { res.writeHead(202); res.end(); return; }
    if (m.method === "tools/list") return antworten({ tools: WERKZEUGE });
    aufrufe.push(m.params);
    if (m.params.name === "aiqora_kaputt") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, error: { code: -32602, message: "Unbekanntes Werkzeug" } }));
      return;
    }
    antworten({ content: [{ type: "text", text: JSON.stringify({ ok: true, name: m.params.name, eingaben: m.params.arguments }) }] });
  });
});

let basis;
before(async () => { await new Promise((r) => ersatz.listen(0, "127.0.0.1", r)); });
after(() => ersatz.close());

function bruecke(schluessel, args = []) {
  basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-bruecke-"));
  return starteHelfer({
    AIQORA_MCP_URL: `http://127.0.0.1:${ersatz.address().port}/mcp`,
    AIQORA_API_KEY: schluessel, AIQORA_SCHLUESSEL_VOM_PLUGIN: "",
    AIQORA_APP_DATEN: path.join(basis, "app"), AIQORA_SCHLUESSEL_ART: "datei", AIQORA_KEIN_REGISTRY: "1", AIQORA_BRUECKE_KOMPAKT: ""
  }, "bruecke.mjs", args);
}

test("reicht Werkzeugliste und Aufrufe unverändert durch", async () => {
  const h = bruecke(SCHLUESSEL);
  try {
    const init = await h.anfrage("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    assert.equal(init.result.serverInfo.name, "aiqora");
    const liste = await h.anfrage("tools/list", {});
    assert.deepEqual(liste.result.tools, WERKZEUGE);
    const r = await h.aufruf("aiqora_generation_music", { prompt: "Sommerlied" });
    assert.deepEqual(r.daten, { ok: true, name: "aiqora_generation_music", eingaben: { prompt: "Sommerlied" } });
    const kaputt = await h.anfrage("tools/call", { name: "aiqora_kaputt", arguments: {} });
    assert.equal(kaputt.error.code, -32602, "Fehler des Servers kommen mit ihrem Code an");
    assert.ok(!h.alleAusgaben().includes(SCHLUESSEL), "Der Schlüssel darf nie in der Ausgabe stehen");
  } finally { await h.beenden(); }
});

test("ohne gültigen Schlüssel gibt es nur aiqora_anmelden mit einer Anleitung für den Nutzer", async () => {
  for (const schluessel of ["", "aiq_falsch_" + "x".repeat(24)]) {
    const h = bruecke(schluessel);
    try {
      const liste = await h.anfrage("tools/list", {});
      assert.deepEqual(liste.result.tools.map((t) => t.name), ["aiqora_anmelden"]);
      const r = await h.aufruf("aiqora_anmelden");
      assert.ok(r.fehler);
      assert.match(r.text, /Einstellungen/);
      const anderes = await h.aufruf("aiqora_whoami");
      assert.ok(anderes.fehler);
      assert.match(anderes.text, /Schlüssel fehlt oder ist ungültig/);
    } finally { await h.beenden(); }
  }
});

test("Sparmodus: drei kleine Werkzeuge statt der ganzen Liste", async () => {
  const h = bruecke(SCHLUESSEL, ["--kompakt"]);
  try {
    const liste = await h.anfrage("tools/list", {});
    assert.deepEqual(liste.result.tools.map((t) => t.name), ["aiqora_werkzeuge", "aiqora_beschreibung", "aiqora_aufruf"]);
    const alle = await h.aufruf("aiqora_werkzeuge");
    assert.equal(alle.text, "aiqora_whoami: Zeigt das Konto.\naiqora_generation_music: Erzeugt einen Song.");
    const suche = await h.aufruf("aiqora_werkzeuge", { suche: "SONG" });
    assert.equal(suche.text, "aiqora_generation_music: Erzeugt einen Song.");
    const b = await h.aufruf("aiqora_beschreibung", { name: "aiqora_generation_music" });
    assert.deepEqual(b.daten.eingaben, WERKZEUGE[1].inputSchema);
    aufrufe.length = 0;
    const r = await h.aufruf("aiqora_aufruf", { name: "aiqora_generation_music", eingaben: { prompt: "Lied" } });
    assert.deepEqual(r.daten.eingaben, { prompt: "Lied" });
    assert.deepEqual(aufrufe, [{ name: "aiqora_generation_music", arguments: { prompt: "Lied" } }]);
    const unbekannt = await h.aufruf("aiqora_aufruf", { name: "aiqora_gibt_es_nicht" });
    assert.ok(unbekannt.fehler);
    assert.equal(aufrufe.length, 1, "unbekannte Werkzeuge gehen nicht an den Server");
  } finally { await h.beenden(); }
});
