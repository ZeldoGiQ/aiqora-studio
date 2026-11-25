// Addons: Lizenzhinweise vor der Installation, Schritte, Stand, Verbindungen und Regeln. Ohne Netz:
// das echte Ausführen der Befehle ist durch einen Ersatz ausgetauscht.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { starteHelfer } from "./hilfen.mjs";

const basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-addons-"));
const STUDIO = path.join(basis, "Studio");
const UMGEBUNG = {
  AIQORA_APP_DATEN: path.join(basis, "app"),
  AIQORA_STUDIO_ORDNER: STUDIO,
  AIQORA_EARSHOT_PFAD: path.join(basis, "gibt-es-nicht", "earshot") // earshot gilt als nicht installiert
};
Object.assign(process.env, UMGEBUNG);
delete process.env.CODEX_HOME;

const addons = await import("../local/lib/addons.mjs");
const programme = await import("../local/lib/programme.mjs");
const heim = (name) => { const h = path.join(basis, name); mkdirSync(h, { recursive: true }); return h; };
const standDatei = (name) => path.join(UMGEBUNG.AIQORA_APP_DATEN, "addons", `${name}.json`);

test("Liste: jedes Addon hat Quelle, Lizenz, Größe und Lizenzhinweise", async () => {
  const l = await addons.liste(heim("leer"));
  assert.deepEqual(l.addons.map((a) => a.name), ["hyperframes", "earshot"]);
  for (const a of l.addons) {
    assert.equal(a.installiert, false, a.name);
    assert.equal(a.installation, null);
    assert.match(a.quelle, /^https:\/\/github\.com\//);
    assert.ok(a.lizenz && a.groesse && a.wofuer);
    assert.ok(a.lizenzhinweise.length >= 3, "Lizenzhinweise fehlen");
  }
  assert.ok(l.lizenz_stand);
  assert.match(l.hinweis, /keine Rechtsberatung/);
  const hf = l.addons[0].lizenzhinweise.join(" ");
  assert.match(hf, /MusicGen.*nicht-kommerziell/, "der Hinweis auf die nicht kommerziell nutzbare Musik darf nicht fehlen");
  assert.match(hf, /bezahltem Tarif/);
});

test("HyperFrames installieren: Schritte in Reihenfolge, Stand fertig, Regeln mit Lizenzhinweisen", async () => {
  const home = heim("hf");
  const gelaufen = [];
  const r = await addons.installieren("hyperframes", {
    home,
    ausfuehren: async (befehl, args) => {
      gelaufen.push([befehl, ...args].join(" "));
      if (args.includes("skills")) { // der echte Befehl legt die Skills an
        mkdirSync(path.join(home, ".agents", "skills", "hyperframes"), { recursive: true });
        writeFileSync(path.join(home, ".agents", "skills", "hyperframes", "SKILL.md"), "---\nname: hyperframes\ndescription: x\n---\n");
      }
      return { ok: !args.includes("telemetry"), ausgabe: "" }; // Abschalten der Nutzungsdaten darf scheitern
    }
  });
  assert.equal(r.ok, true, r.fehler);
  assert.deepEqual(gelaufen, ["npx --yes hyperframes --version", "npx --yes hyperframes skills", "npx --yes hyperframes telemetry disable"]);
  assert.equal(addons.standLesen("hyperframes").stand, "fertig");
  assert.equal(await addons.istInstalliert("hyperframes", home), true);

  const regeln = readFileSync(path.join(STUDIO, "addons.md"), "utf8");
  assert.match(regeln, /## HyperFrames/);
  assert.match(regeln, /Musik nie lokal erzeugen/);
  assert.match(regeln, /Lizenzhinweise für den Nutzer/);
  assert.ok(!regeln.includes("## Earshot"), "nur installierte Addons stehen in den Regeln");
  assert.ok(!existsSync(path.join(STUDIO, ".mcp.json")), "HyperFrames braucht keine Verbindung");
});

test("schlägt ein Schritt fehl, steht der Fehler im Stand und in der Liste", async () => {
  const home = heim("fehler");
  const r = await addons.installieren("hyperframes", { home, ausfuehren: async () => ({ ok: false, ausgabe: "Zeile 1\nnpm ERR! kein Netz" }) });
  assert.equal(r.ok, false);
  assert.match(r.fehler, /HyperFrames laden.*fehlgeschlagen.*kein Netz/);
  const eintrag = (await addons.liste(home)).addons[0];
  assert.equal(eintrag.installation.stand, "fehler");
  assert.match(eintrag.installation.meldung, /kein Netz/);
});

test("eine abgebrochene Installation wird nicht ewig als laufend gezeigt", () => {
  mkdirSync(path.dirname(standDatei("earshot")), { recursive: true });
  writeFileSync(standDatei("earshot"), JSON.stringify({ name: "earshot", pid: 2 ** 22 + 12345, stand: "laeuft", schritt: "Tonmodelle laden" }));
  assert.equal(addons.standLesen("earshot").stand, "abgebrochen");
  assert.throws(() => addons.standLesen("gibt_es_nicht"), /gibt es nicht/);
});

test("Earshot: Verbindung für Claude im Studio-Ordner, für Codex nur wo das Studio eingerichtet ist", async () => {
  const home = heim("es");
  const exe = path.join(basis, "earshot-programm");
  writeFileSync(exe, "");
  process.env.AIQORA_EARSHOT_PFAD = exe;
  try {
    // Codex mit eingerichtetem Studio, Antigravity ohne
    programme.codexEinrichten({ home, wurzel: path.join(basis, "programm") });
    mkdirSync(path.join(home, ".gemini", "config"), { recursive: true });
    const fremd = JSON.stringify({ mcpServers: { anderes: { command: "x" } } });
    writeFileSync(path.join(home, ".gemini", "config", "mcp_config.json"), fremd);
    mkdirSync(STUDIO, { recursive: true });
    writeFileSync(path.join(STUDIO, ".mcp.json"), JSON.stringify({ mcpServers: { meins: { command: "y" } } }));

    const gelaufen = [];
    const r = await addons.installieren("earshot", { home, ausfuehren: async (b, a) => { gelaufen.push([path.basename(b), ...a].join(" ")); return { ok: true, ausgabe: "" }; } });
    assert.equal(r.ok, true, r.fehler);
    assert.deepEqual(gelaufen, ["earshot-programm doctor --fetch"], "schon installiert: nur die Modelle laden");
    assert.deepEqual(r.verbindungen, { claude: ["earshot"], andere: ["codex"] });

    const mcp = JSON.parse(readFileSync(path.join(STUDIO, ".mcp.json"), "utf8")).mcpServers;
    assert.deepEqual(mcp.earshot, { command: exe, args: ["mcp"], env: { EARSHOT_THREADS: "3" } });
    assert.deepEqual(mcp.meins, { command: "y" }, "eigene Einträge bleiben");

    const toml = readFileSync(path.join(home, ".codex", "config.toml"), "utf8");
    assert.match(toml, /\[mcp_servers\.earshot\]\n# aiqora-studio:.*\ncommand = .*earshot-programm"\nargs = \["mcp"\]\n[\s\S]*\[mcp_servers\.earshot\.env\]\nEARSHOT_THREADS = "3"\n/);
    assert.equal(readFileSync(path.join(home, ".gemini", "config", "mcp_config.json"), "utf8"), fremd, "ohne Studio bleibt Antigravity unberührt");

    // Zweites Mal: nichts doppelt, ein eigener earshot-Eintrag des Nutzers bleibt
    mcp.earshot = { command: "mein-earshot" };
    writeFileSync(path.join(STUDIO, ".mcp.json"), JSON.stringify({ mcpServers: mcp }));
    const zweites = await addons.verbindungenEintragen(home);
    assert.deepEqual(zweites, { claude: [], andere: [] });
    assert.equal(JSON.parse(readFileSync(path.join(STUDIO, ".mcp.json"), "utf8")).mcpServers.earshot.command, "mein-earshot");
    assert.equal(readFileSync(path.join(home, ".codex", "config.toml"), "utf8"), toml);

    assert.match(readFileSync(path.join(STUDIO, "addons.md"), "utf8"), /## Earshot[\s\S]*sfx_render/);
  } finally {
    process.env.AIQORA_EARSHOT_PFAD = UMGEBUNG.AIQORA_EARSHOT_PFAD;
  }
});

test("Codex neu einrichten behält die Verbindungen der Addons", () => {
  const zusatz = { earshot: { command: "/pfad/earshot", args: ["mcp"], env: { EARSHOT_THREADS: "3" } } };
  const verb = { ...programme.verbindungen("/programm"), ...zusatz };
  const erstes = programme.codexTomlAnpassen("", verb);
  assert.deepEqual(erstes.eingetragen, ["aiqora", "aiqora-local", "earshot"]);
  assert.equal(programme.codexTomlAnpassen(erstes.text, verb).text, erstes.text, "zweimal einrichten ändert nichts");
  const json = JSON.parse(programme.antigravityJsonAnpassen("", verb).text);
  assert.deepEqual(json.mcpServers.earshot.env, { EARSHOT_THREADS: "3" });
});

test("Werkzeug: ohne Zustimmung zu den Lizenzhinweisen wird nichts installiert", async () => {
  const h = starteHelfer(UMGEBUNG);
  try {
    const liste = await h.aufruf("addons_liste");
    assert.deepEqual(liste.daten.addons.map((a) => a.name), ["hyperframes", "earshot"]);
    const vorher = existsSync(standDatei("earshot")) ? readFileSync(standDatei("earshot"), "utf8") : null;
    for (const args of [{ name: "earshot" }, { name: "earshot", lizenz_bestaetigt: false }]) {
      const r = await h.aufruf("addon_installieren", args);
      assert.ok(!r.fehler, r.text);
      assert.equal(r.daten.gestartet, false);
      assert.ok(r.daten.lizenzhinweise.length >= 3);
      assert.match(r.daten.hinweis, /ausdrücklichen Ja/);
    }
    const nachher = existsSync(standDatei("earshot")) ? readFileSync(standDatei("earshot"), "utf8") : null;
    assert.equal(nachher, vorher, "es wurde nichts gestartet");
    const unbekannt = await h.aufruf("addon_installieren", { name: "boese", lizenz_bestaetigt: true });
    assert.ok(unbekannt.fehler, "unbekannte Addons werden abgelehnt");
  } finally { await h.beenden(); }
});
