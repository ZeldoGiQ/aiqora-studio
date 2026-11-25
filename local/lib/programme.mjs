// Das Studio in anderen Programmen einrichten: OpenAI Codex und Google Antigravity.
// Beide bekommen dieselben zwei Verbindungen wie Claude Code (AIQORA über die Brücke, lokaler Helfer)
// und die Befehle des Studios als Skills. In den Einstellungen dieser Programme steht kein Schlüssel:
// die Brücke (local/bruecke.mjs) holt ihn aus dem Studio.
// Fremde Einträge werden nie überschrieben, außer der Nutzer will es ausdrücklich (ersetzen).
import { execFileSync } from "node:child_process";
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { PLUGIN_ROOT, SKILLS_ORDNER, umgebung } from "./pfade.mjs";

export const SKILL_VORSATZ = "aiqora-";
// Steht in jedem installierten Skill. Nur Ordner mit dieser Markierung werden ersetzt oder entfernt.
export const SKILL_MARKE = "aiqora-studio:skill";
const EINTRAG_MARKE = "aiqora-studio: vom AIQORA Studio eingerichtet";

/**
 * Der Programmordner, auf den Einstellungen und Startknöpfe zeigen sollen.
 * Claude Code startet Plugins aus einem Ordner mit Versionsnummer, der sich bei jedem Update ändert.
 * Dauerhaft ist die Kopie des Marktplatzes daneben; die wird hier bevorzugt.
 */
export function programmOrdner(home = os.homedir()) {
  const eigen = umgebung("AIQORA_PROGRAMM_ORDNER");
  if (eigen) return path.resolve(eigen);
  if (PLUGIN_ROOT.split(path.sep).includes("cache") && PLUGIN_ROOT.includes(path.join(".claude", "plugins"))) {
    try {
      const markt = JSON.parse(readFileSync(path.join(home, ".claude", "plugins", "known_marketplaces.json"), "utf8"));
      const ort = markt?.aiqora?.installLocation;
      if (ort && existsSync(path.join(ort, "local", "server.mjs"))) return path.resolve(ort);
    } catch { /* unten */ }
  }
  return PLUGIN_ROOT;
}

/** Die zwei Verbindungen: Name → Befehl. node mit vollem Pfad, weil Programme mit Fenster oft keinen PATH haben. */
export function verbindungen(wurzel = programmOrdner()) {
  return {
    aiqora: { command: process.execPath, args: [path.join(wurzel, "local", "bruecke.mjs")] },
    "aiqora-local": { command: process.execPath, args: [path.join(wurzel, "local", "server.mjs")] }
  };
}

const istUnsere = (text) => text.includes("aiqora-studio:") || /local[\\/]+(bruecke|server)\.mjs/.test(text);

// ---------- Skills ----------

/**
 * Macht aus einem Skill des Claude-Plugins einen eigenständigen Skill:
 * Name mit Vorsatz (start → aiqora-start), und aus „/aiqora-studio:start“ wird „aiqora-start“.
 */
export function skillUmschreiben(text, name) {
  const neu = text
    .replace(/^name:\s*.*$/m, `name: ${SKILL_VORSATZ}${name}`)
    .replace(/\/aiqora-studio:([a-z0-9-]+)/g, `${SKILL_VORSATZ}$1`);
  const ende = neu.indexOf("\n---", 3);
  const hinweis = `\n<!-- ${SKILL_MARKE}: Wird vom AIQORA Studio installiert und bei Updates ersetzt. Nicht von Hand ändern. -->\n` +
    `Andere Befehle des Studios heißen hier \`${SKILL_VORSATZ}…\` (z. B. \`${SKILL_VORSATZ}start\`). ` +
    "Die Werkzeuge kommen von den Verbindungen `aiqora` und `aiqora-local`.\n";
  return ende < 0 ? neu + hinweis : neu.slice(0, ende + 4) + hinweis + neu.slice(ende + 4);
}

/** Kopiert alle Skills des Studios nach ziel/aiqora-<name>/SKILL.md und räumt alte, nicht mehr vorhandene weg. */
export function skillsInstallieren(ziel) {
  mkdirSync(ziel, { recursive: true });
  const namen = readdirSync(SKILLS_ORDNER, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(SKILLS_ORDNER, e.name, "SKILL.md"))).map((e) => e.name);
  const installiert = [], uebersprungen = [];
  for (const name of namen) {
    const ordner = path.join(ziel, SKILL_VORSATZ + name);
    const datei = path.join(ordner, "SKILL.md");
    // Ein gleichnamiger Ordner ohne unsere Markierung gehört dem Nutzer.
    if (existsSync(ordner) && !(existsSync(datei) && readFileSync(datei, "utf8").includes(SKILL_MARKE))) {
      uebersprungen.push(SKILL_VORSATZ + name);
      continue;
    }
    mkdirSync(ordner, { recursive: true });
    writeFileSync(datei, skillUmschreiben(readFileSync(path.join(SKILLS_ORDNER, name, "SKILL.md"), "utf8"), name), "utf8");
    installiert.push(SKILL_VORSATZ + name);
  }
  for (const e of readdirSync(ziel, { withFileTypes: true })) {
    if (!e.isDirectory() || !e.name.startsWith(SKILL_VORSATZ) || installiert.includes(e.name) || uebersprungen.includes(e.name)) continue;
    const datei = path.join(ziel, e.name, "SKILL.md");
    if (existsSync(datei) && readFileSync(datei, "utf8").includes(SKILL_MARKE)) rmSync(path.join(ziel, e.name), { recursive: true, force: true });
  }
  return { ordner: ziel, installiert, uebersprungen };
}

function sichern(datei) {
  const kopie = datei + ".vor-aiqora-studio.bak";
  if (existsSync(datei) && !existsSync(kopie)) copyFileSync(datei, kopie);
}

// ---------- Codex: ~/.codex/config.toml ----------

const tomlText = (wert) => JSON.stringify(String(wert)); // JSON-Zeichenketten sind gültige TOML-Zeichenketten

function tomlKopf(name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*\\[mcp_servers\\.(?:"${n}"|'${n}'|${n})(\\.[^\\]]+)?\\]\\s*(#.*)?$`);
}

/** Zeilenbereich des Abschnitts [mcp_servers.<name>] samt Unterabschnitten, oder null. */
export function tomlAbschnitt(zeilen, name) {
  const kopf = tomlKopf(name);
  const start = zeilen.findIndex((z) => kopf.test(z));
  if (start < 0) return null;
  let ende = start + 1;
  while (ende < zeilen.length && !(/^\s*\[/.test(zeilen[ende]) && !kopf.test(zeilen[ende]))) ende++;
  return { start, ende };
}

function tomlEintrag(name, v) {
  const env = Object.entries(v.env || {});
  return [
    `[mcp_servers.${name}]`,
    `# ${EINTRAG_MARKE}`,
    `command = ${tomlText(v.command)}`,
    `args = [${v.args.map(tomlText).join(", ")}]`,
    "startup_timeout_sec = 30",
    "tool_timeout_sec = 600",
    ...(env.length ? ["", `[mcp_servers.${name}.env]`, ...env.map(([k, w]) => `${k} = ${tomlText(w)}`)] : [])
  ];
}

/**
 * Trägt die Verbindungen in den Text einer config.toml ein und liefert { text, eingetragen, behalten }.
 * Vorhandene eigene Einträge des Nutzers bleiben stehen (behalten), außer mit ersetzen.
 */
export function codexTomlAnpassen(text, verb, ersetzen = false) {
  let zeilen = text.split(/\r?\n/);
  const eingetragen = [], behalten = [];
  for (const [name, v] of Object.entries(verb)) {
    const b = tomlAbschnitt(zeilen, name);
    if (b && !ersetzen && !istUnsere(zeilen.slice(b.start, b.ende).join("\n"))) { behalten.push(name); continue; }
    const neu = tomlEintrag(name, v);
    if (b) {
      zeilen = [...zeilen.slice(0, b.start), ...neu, "", ...zeilen.slice(b.ende)];
    } else {
      while (zeilen.length && !zeilen[zeilen.length - 1].trim()) zeilen.pop();
      zeilen = [...zeilen, ...(zeilen.length ? [""] : []), ...neu, ""];
    }
    eingetragen.push(name);
  }
  // Nichts eingetragen: die Datei bleibt Zeichen für Zeichen, wie sie ist. Sonst die Zeilenenden der Datei beibehalten.
  if (!eingetragen.length) return { text, eingetragen, behalten };
  return { text: zeilen.join(text.includes("\r\n") ? "\r\n" : "\n"), eingetragen, behalten };
}

export function codexOrdner(home = os.homedir()) {
  return umgebung("CODEX_HOME") ? path.resolve(umgebung("CODEX_HOME")) : path.join(home, ".codex");
}

/** Codex einrichten: Verbindungen in ~/.codex/config.toml, Skills nach ~/.agents/skills. zusatz: Verbindungen von Addons. */
export function codexEinrichten({ home = os.homedir(), ersetzen = false, wurzel, zusatz = {} } = {}) {
  const ordner = codexOrdner(home);
  const datei = path.join(ordner, "config.toml");
  mkdirSync(ordner, { recursive: true });
  const vorher = existsSync(datei) ? readFileSync(datei, "utf8") : "";
  const r = codexTomlAnpassen(vorher, { ...verbindungen(wurzel ?? programmOrdner(home)), ...zusatz }, ersetzen);
  if (r.text !== vorher) { sichern(datei); writeFileSync(datei, r.text, "utf8"); }
  const skills = skillsInstallieren(path.join(home, ".agents", "skills"));
  return { programm: "codex", einstellungen: datei, eingetragen: r.eingetragen, behalten: r.behalten, skills };
}

// ---------- Antigravity: ~/.gemini/config/mcp_config.json ----------

/** Trägt die Verbindungen in den Inhalt einer mcp_config.json ein. Leere Datei zählt als leere Einstellung. */
export function antigravityJsonAnpassen(text, verb, ersetzen = false) {
  const daten = text.trim() ? JSON.parse(text) : {};
  if (!daten || typeof daten !== "object" || Array.isArray(daten)) throw new Error("mcp_config.json hat ein unerwartetes Format.");
  daten.mcpServers = daten.mcpServers && typeof daten.mcpServers === "object" ? daten.mcpServers : {};
  const eingetragen = [], behalten = [];
  for (const [name, v] of Object.entries(verb)) {
    const alt = daten.mcpServers[name];
    if (alt && !ersetzen && !istUnsere(JSON.stringify(alt))) { behalten.push(name); continue; }
    daten.mcpServers[name] = { command: v.command, args: v.args, ...(v.env ? { env: v.env } : {}), timeoutSeconds: 600 };
    eingetragen.push(name);
  }
  return { text: JSON.stringify(daten, null, 2) + "\n", eingetragen, behalten };
}

/**
 * Antigravity einrichten: Verbindungen in ~/.gemini/config/mcp_config.json (App, IDE und agy teilen sich die Datei),
 * Skills nach ~/.gemini/config/skills. Ältere Versionen lesen eine eigene mcp_config.json; gibt es die als
 * echte Datei (kein Verweis auf die gemeinsame), wird sie mit angepasst.
 */
export function antigravityEinrichten({ home = os.homedir(), ersetzen = false, wurzel, zusatz = {} } = {}) {
  const gemini = path.join(home, ".gemini");
  const haupt = path.join(gemini, "config", "mcp_config.json");
  mkdirSync(path.dirname(haupt), { recursive: true });
  if (!existsSync(haupt)) writeFileSync(haupt, "", "utf8");
  const dateien = [haupt];
  for (const alt of ["antigravity", "antigravity-ide"].map((o) => path.join(gemini, o, "mcp_config.json"))) {
    try { if (existsSync(alt) && realpathSync(alt) !== realpathSync(haupt)) dateien.push(alt); } catch { /* nicht lesbar */ }
  }
  const verb = { ...verbindungen(wurzel ?? programmOrdner(home)), ...zusatz };
  let eingetragen = [], behalten = [];
  for (const datei of dateien) {
    const vorher = readFileSync(datei, "utf8");
    const r = antigravityJsonAnpassen(vorher, verb, ersetzen);
    if (r.text !== vorher) { if (vorher.trim()) sichern(datei); writeFileSync(datei, r.text, "utf8"); }
    if (datei === haupt) ({ eingetragen, behalten } = r);
  }
  const skills = skillsInstallieren(path.join(gemini, "config", "skills"));
  return { programm: "antigravity", einstellungen: haupt, weitere: dateien.slice(1), eingetragen, behalten, skills };
}

/**
 * Trägt zusätzliche Verbindungen (von Addons) in Codex und Antigravity ein, aber nur dort, wo das Studio schon
 * eingerichtet ist. Liefert die Namen der Programme, in denen etwas dazukam.
 */
export function zusatzEintragen(zusatz, { home = os.homedir() } = {}) {
  const geaendert = [];
  const ziele = [
    ["codex", path.join(codexOrdner(home), "config.toml"), codexTomlAnpassen],
    ["antigravity", path.join(home, ".gemini", "config", "mcp_config.json"), antigravityJsonAnpassen]
  ];
  for (const [programm, datei, anpassen] of ziele) {
    try {
      if (!existsSync(datei)) continue;
      const vorher = readFileSync(datei, "utf8");
      if (!/local[\\/]+server\.mjs/.test(vorher)) continue; // Studio dort nicht eingerichtet
      const r = anpassen(vorher, zusatz);
      if (r.text !== vorher) { sichern(datei); writeFileSync(datei, r.text, "utf8"); geaendert.push(programm); }
    } catch { /* dieses Programm überspringen */ }
  }
  return geaendert;
}

// ---------- Was ist installiert? ----------

function imPfad(name) {
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", [name], { stdio: "ignore", windowsHide: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function gefunden(home = os.homedir()) {
  return {
    claude: imPfad("claude") || existsSync(path.join(home, ".claude")),
    codex: imPfad("codex") || existsSync(codexOrdner(home)),
    antigravity: imPfad("agy") || existsSync(path.join(home, ".gemini", "config")) || existsSync(path.join(home, ".gemini", "antigravity"))
  };
}

// ---------- Startknopf auf dem Desktop ----------

export function desktopOrdner(home = os.homedir()) {
  const eigen = umgebung("AIQORA_DESKTOP");
  if (eigen) return path.resolve(eigen);
  if (process.platform === "win32") {
    try {
      const o = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "[Environment]::GetFolderPath('Desktop')"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10000, windowsHide: true }).trim();
      if (o) return o;
    } catch { /* Rückfall unten */ }
  }
  return path.join(home, "Desktop");
}

const WIN = process.platform === "win32";
const knopfEndung = () => (WIN ? ".bat" : process.platform === "darwin" ? ".command" : ".sh");

/** Schreibt einen Desktop-Knopf. Eine gleichnamige Datei ohne das Kennzeichen (fremd) wird nicht überschrieben. */
function knopfSchreiben(home, name, kennzeichen, inhalt) {
  const datei = path.join(desktopOrdner(home), name + knopfEndung());
  if (existsSync(datei) && !readFileSync(datei, "utf8").includes(kennzeichen)) {
    return { angelegt: false, datei, grund: "Auf dem Desktop gibt es schon eine andere Datei mit diesem Namen." };
  }
  mkdirSync(path.dirname(datei), { recursive: true });
  writeFileSync(datei, inhalt, "utf8");
  if (!WIN) { try { chmodSync(datei, 0o755); } catch { /* egal */ } }
  return { angelegt: true, datei };
}

/**
 * Legt den Desktop-Knopf „AIQORA Studio (lokal)“ an: ein Terminal, in dem das Studio mit lokalem Modell startet.
 * Eine gleichnamige fremde Datei wird nicht überschrieben.
 */
export function lokalKnopfAnlegen({ home = os.homedir(), wurzel } = {}) {
  const skript = path.join(wurzel ?? programmOrdner(home), "local", "lokal.mjs");
  return knopfSchreiben(home, "AIQORA Studio (lokal)", "lokal.mjs", WIN
    ? `@echo off\r\nchcp 65001 >nul\r\ntitle AIQORA Studio (lokal)\r\n"${process.execPath}" "${skript}"\r\nif errorlevel 1 pause\r\n`
    : `#!/bin/bash\n"${process.execPath}" "${skript}" || read -n 1 -s -r -p "Taste drücken zum Schließen"\n`);
}

/**
 * Legt den Desktop-Knopf „AIQORA Studio“ an, der die Oberfläche im Browser öffnet, falls es ihn noch nicht gibt.
 * Dort trägt der Nutzer seinen AIQORA-Schlüssel ein. Ein vorhandener Knopf bleibt, wie er ist.
 */
export function studioKnopfAnlegen({ home = os.homedir(), wurzel } = {}) {
  const skript = path.join(wurzel ?? programmOrdner(home), "local", "oberflaeche.mjs");
  if (existsSync(path.join(desktopOrdner(home), "AIQORA Studio" + knopfEndung()))) return { angelegt: false, vorhanden: true };
  return knopfSchreiben(home, "AIQORA Studio", "oberflaeche.mjs", WIN
    ? `@echo off\r\nchcp 65001 >nul\r\nstart "" /min "${process.execPath}" "${skript}"\r\n`
    : `#!/bin/bash\n"${process.execPath}" "${skript}"\n`);
}
