// Der Anschluss an AIQORA (MCP über HTTP) gegen einen Ersatz-Server.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const SCHLUESSEL = "aiq_test_" + "k".repeat(30);
const gesehen = [];
let sitzungLaeuftAb = false;

const ersatz = http.createServer((req, res) => {
  let koerper = "";
  req.on("data", (d) => { koerper += d; });
  req.on("end", () => {
    if (req.headers.authorization !== `Bearer ${SCHLUESSEL}`) { res.writeHead(401); res.end(); return; }
    const m = JSON.parse(koerper);
    gesehen.push({ methode: m.method, sitzung: req.headers["mcp-session-id"] || null });
    if (m.method === "initialize") {
      res.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "s-1" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2025-06-18", capabilities: {} } }));
      return;
    }
    if (!m.id) { res.writeHead(202); res.end(); return; }
    if (sitzungLaeuftAb) { sitzungLaeuftAb = false; res.writeHead(404); res.end(); return; }
    const name = m.params.name;
    if (name === "kaputt") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: JSON.stringify({ error: { message: "Zu wenig Credits" } }) }] } })}\n\n`);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify({ effectiveBalance: 42 }) }] } })}\n\n`);
  });
});

let aiqora;
before(async () => {
  await new Promise((r) => ersatz.listen(0, "127.0.0.1", r));
  process.env.AIQORA_MCP_URL = `http://127.0.0.1:${ersatz.address().port}/mcp`;
  aiqora = await import("../local/lib/aiqora.mjs");
});
after(() => ersatz.close());

test("ruft Werkzeuge auf und liest SSE-Antworten", async () => {
  const c = aiqora.erstelleClient(async () => SCHLUESSEL);
  assert.deepEqual(await c.aufrufen("aiqora_get_credit_balance"), { effectiveBalance: 42 });
  assert.deepEqual(gesehen.slice(0, 3).map((g) => g.methode), ["initialize", "notifications/initialized", "tools/call"]);
  assert.equal(gesehen[2].sitzung, "s-1");
});

test("abgelaufene Sitzung wird einmal neu aufgebaut", async () => {
  const c = aiqora.erstelleClient(async () => SCHLUESSEL);
  await c.aufrufen("x");
  sitzungLaeuftAb = true;
  assert.deepEqual(await c.aufrufen("x"), { effectiveBalance: 42 });
});

test("Fehler von AIQORA kommen als verständliche Meldung", async () => {
  const c = aiqora.erstelleClient(async () => SCHLUESSEL);
  await assert.rejects(c.aufrufen("kaputt"), /Zu wenig Credits/);
});

test("falscher oder fehlender Schlüssel gibt SchluesselFehler", async () => {
  await assert.rejects(aiqora.erstelleClient(async () => "aiq_falsch_" + "x".repeat(20)).aufrufen("x"), aiqora.SchluesselFehler);
  await assert.rejects(aiqora.erstelleClient(async () => "").aufrufen("x"), aiqora.SchluesselFehler);
});

test("fremde Server nur mit https", () => {
  process.env.AIQORA_MCP_URL = "http://boese.example/mcp";
  assert.throws(() => aiqora.serverUrl(), /https/);
  process.env.AIQORA_MCP_URL = `http://127.0.0.1:${ersatz.address().port}/mcp`;
});
