// Die lokale Oberfläche: Sicherheit, Projekte, Dateien, Schlüssel.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-ui-"));
const studio = path.join(basis, "Studio");
const GEHEIM = "aiq_test_NIEMALS_ZEIGEN_1234567890";
Object.assign(process.env, {
  AIQORA_STUDIO_ORDNER: studio,
  AIQORA_APP_DATEN: path.join(basis, "app"),
  AIQORA_SCHLUESSEL_ART: "datei",
  AIQORA_KEIN_REGISTRY: "1",
  AIQORA_API_KEY: GEHEIM,
  AIQORA_SCHLUESSEL_VOM_PLUGIN: "1"
});

const { erstelleServer } = await import("../local/lib/oberflaeche.mjs");

const TOKEN = "t".repeat(43);
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a6b30000000049454e44ae426082", "hex");
const aufrufe = [];
const fakeAiqora = {
  async aufrufen(name, args) {
    aufrufe.push({ name, args });
    if (name === "aiqora_get_credit_balance") return { effectiveBalance: 123.5 };
    if (name === "aiqora_list_transactions") {
      return { transactions: [{ id: "a", amount: -9, type: "spend", description: "Lip Sync", created_at: "2026-11-16T10:00:00Z" }], next_before: null };
    }
    throw new Error("unerwartet");
  },
  async schluesselPruefen() { return true; },
  zuruecksetzen() {}
};

let server, port;

before(async () => {
  const projekt = path.join(studio, "projekte", "2026-11-16-test-projekt");
  for (const u of ["bilder", "fertig"]) mkdirSync(path.join(projekt, u), { recursive: true });
  writeFileSync(path.join(projekt, "bilder", "eins.png"), PNG);
  writeFileSync(path.join(projekt, "fertig", "film.mp4"), Buffer.alloc(5000, 1));
  writeFileSync(path.join(projekt, "notizen.md"), "# Test\n<script>alert(1)</script>");
  writeFileSync(path.join(studio, "geheim.txt"), "nicht ausliefern");
  server = erstelleServer({ token: TOKEN, aiqora: fakeAiqora });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});

after(() => server.close());

function anfrage(pfad, { methode = "GET", header = {}, koerper } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1", port, path: pfad, method: methode,
      headers: { host: `127.0.0.1:${port}`, ...header }
    }, (res) => {
      const teile = [];
      res.on("data", (d) => teile.push(d));
      res.on("end", () => {
        const text = Buffer.concat(teile).toString("utf8");
        let json = null;
        try { json = JSON.parse(text); } catch { /* kein JSON */ }
        resolve({ status: res.statusCode, header: res.headers, text, json, roh: Buffer.concat(teile) });
      });
    });
    req.on("error", reject);
    if (koerper !== undefined) req.write(typeof koerper === "string" ? koerper : JSON.stringify(koerper));
    req.end();
  });
}

const cookie = () => ({ cookie: `aiqora_studio_${port}=${TOKEN}` });
const post = () => ({ ...cookie(), origin: `http://127.0.0.1:${port}`, "x-aiqora-studio": "1", "content-type": "application/json" });

test("ohne Sitzung gibt es nichts", async () => {
  assert.equal((await anfrage("/api/status")).status, 401);
  assert.equal((await anfrage("/api/projekte")).status, 401);
  const seite = await anfrage("/");
  assert.equal(seite.status, 401);
  assert.doesNotMatch(seite.text, /app\.js/);
});

test("falsches Kennwort wird abgelehnt, richtiges setzt ein HttpOnly-Cookie", async () => {
  assert.equal((await anfrage("/start?t=falsch")).status, 403);
  const r = await anfrage(`/start?t=${TOKEN}`);
  assert.equal(r.status, 303);
  assert.equal(r.header.location, "/");
  assert.match(r.header["set-cookie"][0], /HttpOnly/);
  assert.match(r.header["set-cookie"][0], /SameSite=Strict/);
});

test("fremder Host wird abgelehnt (Schutz gegen DNS-Rebinding)", async () => {
  const r = await anfrage("/api/status", { header: { ...cookie(), host: "boese.example:80" } });
  assert.equal(r.status, 421);
});

test("Änderungen nur von der eigenen Seite", async () => {
  const ohneOrigin = await anfrage("/api/oeffnen", { methode: "POST", header: { ...cookie(), "x-aiqora-studio": "1" }, koerper: {} });
  assert.equal(ohneOrigin.status, 403);
  const fremd = await anfrage("/api/oeffnen", { methode: "POST", header: { ...post(), origin: "https://boese.example" }, koerper: {} });
  assert.equal(fremd.status, 403);
  const ohneKopf = await anfrage("/api/schluessel", { methode: "POST", header: { ...post(), "x-aiqora-studio": "" }, koerper: { schluessel: "x" } });
  assert.equal(ohneKopf.status, 403);
});

test("Seite kommt mit strenger Content-Security-Policy", async () => {
  const r = await anfrage("/", { header: cookie() });
  assert.equal(r.status, 200);
  assert.match(r.header["content-security-policy"], /script-src 'self'/);
  assert.equal(r.header["x-frame-options"], "DENY");
});

test("Status verrät den Schlüssel nie", async () => {
  const r = await anfrage("/api/status", { header: cookie() });
  assert.equal(r.status, 200);
  assert.equal(r.json.schluessel, true);
  assert.equal(r.json.schluessel_quelle, "plugin");
  assert.ok(!r.text.includes(GEHEIM));
});

test("Guthaben und Aufträge kommen von AIQORA", async () => {
  assert.equal((await anfrage("/api/konto", { header: cookie() })).json.guthaben, 123.5);
  const a = await anfrage("/api/auftraege?anzahl=5&vor=2026-11-16T10:00:00Z", { header: cookie() });
  assert.equal(a.json.eintraege[0].betrag, -9);
  assert.deepEqual(aufrufe.at(-1), { name: "aiqora_list_transactions", args: { limit: 5, before: "2026-11-16T10:00:00Z" } });
});

test("Projekte und Dateien werden aufgelistet", async () => {
  const liste = (await anfrage("/api/projekte", { header: cookie() })).json.projekte;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].bilder, 1);
  assert.equal(liste[0].videos, 1);
  assert.equal(liste[0].titelbild.pfad, "fertig/film.mp4");
  const p = (await anfrage("/api/projekt?name=2026-11-16-test-projekt", { header: cookie() })).json;
  assert.deepEqual(p.dateien.map((d) => d.pfad).sort(), ["bilder/eins.png", "fertig/film.mp4", "notizen.md"]);
  assert.match(p.notizen, /<script>/); // kommt als Text, die Seite setzt es per textContent
});

test("Dateien werden ausgeliefert, auch in Stücken für Videos", async () => {
  const bild = await anfrage("/datei?projekt=2026-11-16-test-projekt&pfad=bilder%2Feins.png", { header: cookie() });
  assert.equal(bild.status, 200);
  assert.equal(bild.header["content-type"], "image/png");
  assert.ok(bild.roh.equals(PNG));
  const stueck = await anfrage("/datei?projekt=2026-11-16-test-projekt&pfad=fertig%2Ffilm.mp4", { header: { ...cookie(), range: "bytes=100-199" } });
  assert.equal(stueck.status, 206);
  assert.equal(stueck.roh.length, 100);
  assert.equal(stueck.header["content-range"], "bytes 100-199/5000");
});

test("kein Zugriff außerhalb des Projekts", async () => {
  for (const pfad of ["..%2F..%2Fgeheim.txt", "..%2Fgeheim.txt", encodeURIComponent(path.join(studio, "geheim.txt")), "notizen.md"]) {
    const r = await anfrage(`/datei?projekt=2026-11-16-test-projekt&pfad=${pfad}`, { header: cookie() });
    assert.equal(r.status, 400, pfad);
    assert.ok(!r.text.includes("nicht ausliefern"));
  }
  for (const projekt of ["..", "..%2F..", "%2Fetc", ".versteckt", "gibt-es-nicht"]) {
    const r = await anfrage(`/api/projekt?name=${projekt}`, { header: cookie() });
    assert.equal(r.status, 400, projekt);
  }
});

test("Schlüssel speichern: falsches Format abgelehnt, richtiges gespeichert, nie zurückgegeben", async () => {
  const falsch = await anfrage("/api/schluessel", { methode: "POST", header: post(), koerper: { schluessel: "kurz" } });
  assert.equal(falsch.status, 400);
  const neu = "aiq_live_" + "x".repeat(30);
  const ok = await anfrage("/api/schluessel", { methode: "POST", header: post(), koerper: { schluessel: neu } });
  assert.equal(ok.status, 200);
  assert.ok(!ok.text.includes(neu));
  const { gespeichert } = await import("../local/lib/schluessel.mjs");
  assert.equal(await gespeichert(), neu);
});
