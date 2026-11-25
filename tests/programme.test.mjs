// Das Studio in Codex und Antigravity einrichten, ohne fremde Einstellungen anzutasten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-programme-"));
delete process.env.CODEX_HOME;
process.env.AIQORA_DESKTOP = path.join(basis, "Desktop");
const p = await import("../local/lib/programme.mjs");

const WURZEL = path.join(basis, "programm");
const verb = p.verbindungen(WURZEL);
const heim = (name) => { const h = path.join(basis, name); mkdirSync(h, { recursive: true }); return h; };

test("Skills bekommen einen Vorsatz, Verweise auf Claude-Befehle werden umgeschrieben", () => {
  const neu = p.skillUmschreiben("---\nname: start\ndescription: Startet.\n---\n\n1. `/aiqora-studio:update` anbieten, wie bei `/aiqora-studio:musik`.\n", "start");
  assert.match(neu, /^---\nname: aiqora-start\ndescription: Startet\.\n---\n/);
  assert.ok(neu.includes("`aiqora-update` anbieten, wie bei `aiqora-musik`"));
  assert.ok(!neu.includes("/aiqora-studio:"));
  assert.ok(neu.includes(p.SKILL_MARKE));
});

test("Skills installieren: alle Befehle, eigene Ordner des Nutzers bleiben, veraltete verschwinden", () => {
  const ziel = path.join(heim("skills"), "skills");
  mkdirSync(path.join(ziel, "aiqora-bild"), { recursive: true });
  writeFileSync(path.join(ziel, "aiqora-bild", "SKILL.md"), "---\nname: aiqora-bild\ndescription: Mein eigener.\n---\n");
  mkdirSync(path.join(ziel, "aiqora-alt"), { recursive: true });
  writeFileSync(path.join(ziel, "aiqora-alt", "SKILL.md"), `---\nname: aiqora-alt\ndescription: Alt.\n---\n<!-- ${p.SKILL_MARKE} -->\n`);
  mkdirSync(path.join(ziel, "fremd"), { recursive: true });

  const r = p.skillsInstallieren(ziel);
  assert.ok(r.installiert.includes("aiqora-start") && r.installiert.includes("aiqora-musikvideo"));
  assert.deepEqual(r.uebersprungen, ["aiqora-bild"]);
  assert.match(readFileSync(path.join(ziel, "aiqora-bild", "SKILL.md"), "utf8"), /Mein eigener/);
  assert.match(readFileSync(path.join(ziel, "aiqora-start", "SKILL.md"), "utf8"), /^---\nname: aiqora-start\n/);
  assert.ok(!existsSync(path.join(ziel, "aiqora-alt")), "veralteter eigener Skill wird entfernt");
  assert.ok(existsSync(path.join(ziel, "fremd")), "fremde Ordner bleiben");
  for (const ordner of readdirSync(ziel).filter((n) => r.installiert.includes(n))) {
    assert.ok(!readFileSync(path.join(ziel, ordner, "SKILL.md"), "utf8").includes("/aiqora-studio:"), ordner);
  }
  assert.deepEqual(p.skillsInstallieren(ziel).installiert, r.installiert, "zweimal einrichten ändert nichts");
});

test("Codex: Verbindungen eintragen, fremde Einträge und alles andere bleiben", () => {
  const vorher = [
    "model = \"gpt-5\"", "",
    "[mcp_servers.aiqora]", "url = \"https://example.invalid/mcp\"", "bearer_token_env_var = \"AIQORA_API_KEY\"", "",
    "[mcp_servers.aiqora_beta]", "url = \"https://beta.invalid/mcp\"", "",
    "[mcp_servers.wavespeed]", "command = \"npx\"", "[mcp_servers.wavespeed.env]", "X = \"1\"", ""
  ].join("\n");
  const r = p.codexTomlAnpassen(vorher, verb);
  assert.deepEqual(r.behalten, ["aiqora"]);
  assert.deepEqual(r.eingetragen, ["aiqora-local"]);
  assert.ok(r.text.startsWith(vorher.trimEnd()), "bestehender Inhalt bleibt unverändert vorn stehen");
  assert.match(r.text, /\[mcp_servers\.aiqora-local\]\n# aiqora-studio:.*\ncommand = ".*"\nargs = \[".*server\.mjs"\]\nstartup_timeout_sec = 30\ntool_timeout_sec = 600\n/);
  assert.ok(!/key|token\s*=|Bearer/i.test(r.text.slice(vorher.length)), "kein Schlüssel in den neuen Zeilen");

  const nochmal = p.codexTomlAnpassen(r.text, verb);
  assert.equal(nochmal.text, r.text, "zweimal einrichten ändert nichts");

  const ersetzt = p.codexTomlAnpassen(r.text, verb, true);
  assert.deepEqual(ersetzt.eingetragen, ["aiqora", "aiqora-local"]);
  assert.ok(!ersetzt.text.includes("example.invalid"), "eigener Eintrag ist mit ersetzen weg");
  assert.match(ersetzt.text, /\[mcp_servers\.aiqora\]\n# aiqora-studio:.*\ncommand = ".*"\nargs = \[".*bruecke\.mjs"\]/);
  for (const bleibt of ["model = \"gpt-5\"", "[mcp_servers.aiqora_beta]", "beta.invalid", "[mcp_servers.wavespeed.env]", "X = \"1\""]) {
    assert.ok(ersetzt.text.includes(bleibt), `${bleibt} muss bleiben`);
  }
});

test("Codex: Abschnitt mit Unterabschnitt wird als Ganzes ersetzt", () => {
  const vorher = "[mcp_servers.aiqora]\ncommand = \"node\"\nargs = [\"C:/alt/local/bruecke.mjs\"]\n[mcp_servers.aiqora.env]\nA = \"1\"\n[andere]\nx = 1\n";
  const r = p.codexTomlAnpassen(vorher, { aiqora: verb.aiqora });
  assert.ok(!r.text.includes("C:/alt/") && !r.text.includes("[mcp_servers.aiqora.env]"));
  assert.ok(r.text.includes("[andere]\nx = 1"));
});

test("Codex: Zeilenenden und Leerzeilen der Datei bleiben, wie sie sind", () => {
  const vorher = "model = \"gpt-5\"\r\n\r\n\r\n\r\n[andere]\r\nx = 1\r\n";
  const r = p.codexTomlAnpassen(vorher, verb);
  assert.ok(r.text.startsWith(vorher), "vorhandene Zeilen unverändert");
  assert.ok(!/[^\r]\n/.test(r.text), "durchgehend dieselben Zeilenenden");
  assert.equal(p.codexTomlAnpassen(r.text, verb).text, r.text);
  const fremd = "[mcp_servers.aiqora]\nurl = \"https://example.invalid\"\n\n\n\n[mcp_servers.aiqora-local]\ncommand = \"meins\"\n";
  assert.equal(p.codexTomlAnpassen(fremd, verb).text, fremd, "nur eigene Einträge: Datei bleibt Zeichen für Zeichen gleich");
});

test("Codex einrichten: schreibt config.toml, sichert die alte, installiert Skills", () => {
  const home = heim("codex-home");
  mkdirSync(path.join(home, ".codex"));
  writeFileSync(path.join(home, ".codex", "config.toml"), "model = \"gpt-5\"\n");
  const r = p.codexEinrichten({ home, wurzel: WURZEL });
  assert.deepEqual(r.eingetragen, ["aiqora", "aiqora-local"]);
  assert.equal(readFileSync(path.join(home, ".codex", "config.toml.vor-aiqora-studio.bak"), "utf8"), "model = \"gpt-5\"\n");
  assert.match(readFileSync(path.join(home, ".codex", "config.toml"), "utf8"), /bruecke\.mjs/);
  assert.ok(existsSync(path.join(home, ".agents", "skills", "aiqora-start", "SKILL.md")));
});

test("Antigravity: leere Datei, fremde Einträge, kaputte Datei", () => {
  const leer = p.antigravityJsonAnpassen("", verb);
  assert.deepEqual(Object.keys(JSON.parse(leer.text).mcpServers), ["aiqora", "aiqora-local"]);
  assert.equal(JSON.parse(leer.text).mcpServers.aiqora.args[0], path.join(WURZEL, "local", "bruecke.mjs"));

  const fremd = JSON.stringify({ mcpServers: { aiqora: { serverUrl: "https://example.invalid/mcp" }, anderes: { command: "x" } }, sonst: 1 });
  const r = p.antigravityJsonAnpassen(fremd, verb);
  assert.deepEqual(r.behalten, ["aiqora"]);
  const daten = JSON.parse(r.text);
  assert.equal(daten.mcpServers.aiqora.serverUrl, "https://example.invalid/mcp");
  assert.equal(daten.mcpServers.anderes.command, "x");
  assert.equal(daten.sonst, 1);
  assert.ok(daten.mcpServers["aiqora-local"].command);
  assert.equal(p.antigravityJsonAnpassen(r.text, verb).text, r.text, "zweimal einrichten ändert nichts");
  assert.equal(JSON.parse(p.antigravityJsonAnpassen(fremd, verb, true).text).mcpServers.aiqora.serverUrl, undefined);
  assert.throws(() => p.antigravityJsonAnpassen("{ kaputt", verb));
});

test("Antigravity einrichten: gemeinsame Datei, ältere eigene Datei und Skills", () => {
  const home = heim("agy-home");
  mkdirSync(path.join(home, ".gemini", "antigravity-ide"), { recursive: true });
  writeFileSync(path.join(home, ".gemini", "antigravity-ide", "mcp_config.json"), "");
  const r = p.antigravityEinrichten({ home, wurzel: WURZEL });
  assert.deepEqual(r.eingetragen, ["aiqora", "aiqora-local"]);
  assert.equal(r.weitere.length, 1);
  for (const datei of [r.einstellungen, ...r.weitere]) assert.ok(JSON.parse(readFileSync(datei, "utf8")).mcpServers.aiqora);
  assert.ok(existsSync(path.join(home, ".gemini", "config", "skills", "aiqora-start", "SKILL.md")));
});

test("Desktop-Knopf für lokale Modelle: wird angelegt, fremde Datei bleibt", () => {
  const r = p.lokalKnopfAnlegen({ wurzel: WURZEL });
  assert.ok(r.angelegt);
  const inhalt = readFileSync(r.datei, "utf8");
  assert.ok(inhalt.includes(path.join(WURZEL, "local", "lokal.mjs")));
  assert.ok(p.lokalKnopfAnlegen({ wurzel: WURZEL }).angelegt, "eigenen Knopf darf das Studio erneuern");
  writeFileSync(r.datei, "mein eigenes Skript\n");
  const zweiter = p.lokalKnopfAnlegen({ wurzel: WURZEL });
  assert.equal(zweiter.angelegt, false);
  assert.equal(readFileSync(r.datei, "utf8"), "mein eigenes Skript\n");
});

test("Desktop-Knopf für die Oberfläche: nur anlegen, wenn es noch keinen gibt", () => {
  const r = p.studioKnopfAnlegen({ wurzel: WURZEL });
  assert.ok(r.angelegt);
  assert.ok(readFileSync(r.datei, "utf8").includes(path.join(WURZEL, "local", "oberflaeche.mjs")));
  assert.deepEqual(p.studioKnopfAnlegen({ wurzel: WURZEL }), { angelegt: false, vorhanden: true });
});
