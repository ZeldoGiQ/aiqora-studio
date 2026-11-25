// Addons: Zusatzprogramme, die der Nutzer nach der Installation selbst dazuholen kann.
// Sie gehören nicht zum Studio und liegen nicht in diesem Repo. Jedes wird beim Installieren von seiner
// Originalquelle geladen, und der Nutzer sieht vorher die Lizenzhinweise und muss ihnen zustimmen.
// Die Hinweise sind eine Recherche mit dem unten genannten Stand, keine Rechtsberatung.
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Fehler, appDatenOrdner, studioOrdner, umgebung } from "./pfade.mjs";
import * as programme from "./programme.mjs";

export const LIZENZ_STAND = "November 2026";
const WIN = process.platform === "win32";

// Earshot wird auf eine feste, geprüfte Version festgelegt (v0.4.1), damit nicht ungeprüfter neuer Code
// auf den Rechnern der Nutzer landet. Beim Anheben: Lizenz und Klangbank neu prüfen.
const EARSHOT_QUELLE = "earshot[mcp] @ git+https://github.com/Leonxlnx/earshot@4ac3d2ac2b151e1c23376f9ce7f3047a17050013";

export const ADDONS = {
  hyperframes: {
    titel: "HyperFrames",
    wofuer: "Erklärgrafiken, Titel, Untertitel und Übergänge als Video",
    anbieter: "HeyGen",
    quelle: "https://github.com/heygen-com/hyperframes",
    lizenz: "Apache-2.0",
    groesse: "klein; einzelne Funktionen laden bei der ersten Nutzung eigene Modelle (bis etwa 300 MB)",
    lizenzhinweise: [
      "Das Programm selbst darfst du kommerziell nutzen (Lizenz Apache-2.0).",
      "Musik: Die lokale Musik-Notlösung von HyperFrames (MusicGen) ist nur für nicht-kommerzielle Nutzung freigegeben. Das Studio nimmt deshalb Musik immer von AIQORA.",
      "Stimme: Die lokale Stimme (Kokoro) darfst du kommerziell nutzen. ElevenLabs und HeyGen erlauben das nur mit bezahltem Tarif.",
      "Soundeffekte aus dem Netz: Bei Lizenz „CC BY“ musst du den Urheber nennen, zum Beispiel in der Videobeschreibung. HyperFrames legt dafür im Projekt die Datei CREDITS.md an.",
      "Farb-Looks (LUTs), einige mitgelieferte Texturen und das Freistellen von Personen: Dafür ist keine eindeutige Lizenz angegeben. Für kommerzielle Videos besser nicht verwenden oder selbst prüfen.",
      "HyperFrames sendet von sich aus anonyme Nutzungsdaten an HeyGen. Das Studio schaltet das bei der Installation ab."
    ],
    regeln: [
      "Für Erklärgrafiken, Titel, Untertitel und Übergänge: zuerst den Skill `hyperframes` lesen und ihm folgen.",
      "Musik nie lokal erzeugen (MusicGen ist nicht kommerziell nutzbar). Musik kommt immer von AIQORA.",
      "Stimme über AIQORA, lokal nur mit Kokoro. ElevenLabs oder HeyGen nur, wenn der Nutzer sagt, dass er dort einen bezahlten Tarif hat.",
      "Soundeffekte aus dem Netz mit Lizenz CC BY: `CREDITS.md` im Projekt behalten und dem Nutzer sagen, dass er die Quellen in der Videobeschreibung nennen muss. Gibt es earshot, dessen Klangbank vorziehen.",
      "Farb-Looks (LUTs), mitgelieferte Texturen und das Freistellen von Personen nur, wenn der Nutzer es ausdrücklich will. Dann dazusagen, dass die Lizenz dafür nicht geklärt ist."
    ]
  },
  earshot: {
    titel: "Earshot",
    wofuer: "Soundeffekte aus einer eigenen Klangbank und Tonprüfung fertiger Videos (Lautheit, Synchronität)",
    anbieter: "Leon Lin",
    quelle: "https://github.com/Leonxlnx/earshot",
    lizenz: "MIT",
    groesse: "etwa 1 GB (zwei Tonmodelle), das Laden dauert einige Minuten",
    lizenzhinweise: [
      "Das Programm darfst du kommerziell nutzen (Lizenz MIT).",
      "Die Soundeffekte der Klangbank werden auf deinem Rechner erzeugt. Sie gehören dir: frei für jede Nutzung, auch kommerziell, ohne Namensnennung.",
      "Die zwei Tonmodelle zum Prüfen (CLAP von LAION, Lizenz Apache-2.0, und AST vom MIT, Lizenz BSD-3-Clause) dürfen kommerziell genutzt werden.",
      "Passt du einen Effekt an eine eigene Aufnahme an, gilt dafür die Lizenz dieser Aufnahme."
    ],
    regeln: [
      "Soundeffekte nur, wo im Bild etwas passiert (Tür, Schritt, Klick, Schnitt). Nimm sie aus der earshot-Bank (`sfx_list`, `sfx_render`): Sie sind frei nutzbar und kosten kein Guthaben.",
      "Bei Musikvideos keine Effekte über den Song.",
      "Fertige Videos mit earshot prüfen: Lautheit etwa −14 LUFS, Effekte deutlich leiser als die Stimme, Ton synchron zum Bild.",
      "Ist earshot nicht verfügbar: ohne Effekte weitermachen."
    ]
  }
};

function pruefeName(name) {
  if (!ADDONS[name]) throw new Fehler(`Dieses Addon gibt es nicht. Möglich sind: ${Object.keys(ADDONS).join(", ")}.`);
  return name;
}

// ---------- Was ist installiert? ----------

function imPfad(name) {
  return new Promise((resolve) => {
    execFile(WIN ? "where.exe" : "which", [name], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      resolve(err ? "" : String(stdout).split(/\r?\n/).map((z) => z.trim()).find(Boolean) || "");
    });
  });
}

async function finden(name, orte) {
  return orte.find((o) => existsSync(o)) || (await imPfad(name));
}

/** Pfad des earshot-Programms oder "". uv legt es in ~/.local/bin ab. */
export function earshotPfad(home = os.homedir()) {
  const eigen = umgebung("AIQORA_EARSHOT_PFAD");
  if (eigen) return Promise.resolve(existsSync(eigen) ? eigen : "");
  return finden("earshot", [path.join(home, ".local", "bin", WIN ? "earshot.exe" : "earshot")]);
}

function uvPfad(home = os.homedir()) {
  const lokal = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const exe = WIN ? "uv.exe" : "uv";
  return finden("uv", [path.join(home, ".local", "bin", exe), path.join(lokal, "Microsoft", "WinGet", "Links", exe), "/opt/homebrew/bin/uv", "/usr/local/bin/uv"]);
}

export async function istInstalliert(name, home = os.homedir()) {
  if (pruefeName(name) === "earshot") return Boolean(await earshotPfad(home));
  return [path.join(home, ".agents", "skills"), path.join(home, ".claude", "skills")]
    .some((o) => existsSync(path.join(o, "hyperframes", "SKILL.md")));
}

// ---------- Stand einer laufenden Installation ----------

const standDatei = (name) => path.join(appDatenOrdner(), "addons", `${name}.json`);

function standSchreiben(name, daten) {
  mkdirSync(path.dirname(standDatei(name)), { recursive: true });
  writeFileSync(standDatei(name), JSON.stringify({ name, pid: process.pid, ...daten }) + "\n", "utf8");
}

function lebt(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

/** { stand: laeuft | fertig | fehler | abgebrochen, schritt, meldung } oder null, wenn nie installiert wurde. */
export function standLesen(name) {
  try {
    const s = JSON.parse(readFileSync(standDatei(pruefeName(name)), "utf8"));
    if (s.stand === "laeuft" && !lebt(s.pid)) return { ...s, stand: "abgebrochen" };
    return s;
  } catch (e) {
    if (e instanceof Fehler) throw e;
    return null;
  }
}

/** Alle Addons mit Lizenzhinweisen und Stand, für die Anzeige beim Nutzer. */
export async function liste(home = os.homedir()) {
  return {
    lizenz_stand: LIZENZ_STAND,
    hinweis: "Addons gehören nicht zum Studio. Sie werden von ihrer Originalquelle geladen. Die Lizenzhinweise sind eine Recherche und keine Rechtsberatung.",
    addons: await Promise.all(Object.entries(ADDONS).map(async ([name, a]) => {
      const s = standLesen(name);
      return {
        name, titel: a.titel, wofuer: a.wofuer, anbieter: a.anbieter, quelle: a.quelle, lizenz: a.lizenz, groesse: a.groesse,
        installiert: await istInstalliert(name, home),
        installation: s ? { stand: s.stand, schritt: s.schritt || "", meldung: s.meldung || "" } : null,
        lizenzhinweise: a.lizenzhinweise
      };
    }))
  };
}

// ---------- Installieren ----------

/**
 * Umgebung für uv unter Windows: Programme und Python nicht unter AppData ablegen. Startet die Claude-App die
 * Installation, leitet Windows AppData in einen Paketordner um, und earshot liefe dann nur aus Claude heraus.
 */
function uvUmgebung() {
  if (!WIN) return {};
  const basis = path.join(appDatenOrdner(), "uv");
  return { UV_TOOL_DIR: path.join(basis, "tools"), UV_PYTHON_INSTALL_DIR: path.join(basis, "python") };
}

/**
 * Die Schritte einer Installation: [{ titel, befehl, args, env, darfFehlen }].
 * befehl "npx" läuft über die Shell (unter Windows eine .cmd-Datei); alle Angaben sind fest, nichts kommt vom Nutzer.
 */
export async function schritte(name, home = os.homedir()) {
  if (pruefeName(name) === "hyperframes") {
    return [
      { titel: "HyperFrames laden", befehl: "npx", args: ["--yes", "hyperframes", "--version"] },
      { titel: "Befehle für die Programme installieren", befehl: "npx", args: ["--yes", "hyperframes", "skills"] },
      { titel: "Nutzungsdaten abschalten", befehl: "npx", args: ["--yes", "hyperframes", "telemetry", "disable"], darfFehlen: true }
    ];
  }
  const liste = [];
  let earshot = await earshotPfad(home);
  if (!earshot) {
    if (!(await imPfad("git"))) throw new Fehler("Für Earshot fehlt das Programm git. Bitte zuerst installieren (Windows: winget install Git.Git, Mac: brew install git).");
    let uv = await uvPfad(home);
    if (!uv) {
      if (WIN) liste.push({ titel: "Hilfsprogramm uv installieren", befehl: "winget", args: ["install", "--id", "astral-sh.uv", "-e", "--accept-source-agreements", "--accept-package-agreements"] });
      else if (await imPfad("brew")) liste.push({ titel: "Hilfsprogramm uv installieren", befehl: "brew", args: ["install", "uv"] });
      else throw new Fehler("Für Earshot fehlt das Hilfsprogramm uv. Bitte zuerst installieren: https://docs.astral.sh/uv/");
      uv = () => uvPfad(home); // erst nach dem Schritt davor bekannt
    }
    liste.push({ titel: "Earshot installieren", befehl: uv, args: ["tool", "install", EARSHOT_QUELLE], env: uvUmgebung() });
    earshot = () => earshotPfad(home);
  }
  liste.push({ titel: "Tonmodelle laden (etwa 1 GB)", befehl: earshot, args: ["doctor", "--fetch"] });
  return liste;
}

/** Führt einen Schritt aus und liefert { ok, ausgabe } mit dem Ende der Ausgabe. */
export function laufen(befehl, args, env) {
  return new Promise((resolve) => {
    const shell = befehl === "npx";
    const kind = spawn(shell ? `npx ${args.join(" ")}` : befehl, shell ? [] : args, {
      shell, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env }
    });
    let ende = "";
    const merken = (d) => { ende = (ende + d).slice(-1500); };
    kind.stdout.on("data", merken);
    kind.stderr.on("data", merken);
    kind.on("error", (e) => resolve({ ok: false, ausgabe: e.message }));
    kind.on("exit", (code) => resolve({ ok: code === 0, ausgabe: ende.trim() }));
  });
}

/**
 * Installiert ein Addon Schritt für Schritt und hält den Stand in einer Datei fest (für addons_liste).
 * Danach: Verbindungen eintragen und die Regeln in addons.md im Studio-Ordner schreiben.
 * optionen.ausfuehren ersetzt in Tests das echte Ausführen.
 */
export async function installieren(name, optionen = {}) {
  const home = optionen.home ?? os.homedir();
  const ausfuehren = optionen.ausfuehren ?? laufen;
  pruefeName(name);
  try {
    for (const s of await schritte(name, home)) {
      standSchreiben(name, { stand: "laeuft", schritt: s.titel });
      const befehl = typeof s.befehl === "function" ? await s.befehl() : s.befehl;
      if (!befehl) throw new Fehler(`„${s.titel}“ ist nicht möglich: Das Programm aus dem Schritt davor wurde nicht gefunden. Starte deinen Rechner neu und versuche es noch einmal.`);
      const r = await ausfuehren(befehl, s.args, s.env || {});
      if (!r.ok && !s.darfFehlen) throw new Fehler(`„${s.titel}“ ist fehlgeschlagen.${r.ausgabe ? " Letzte Meldung: " + r.ausgabe.split(/\r?\n/).pop().slice(0, 300) : ""}`);
    }
    const eingetragen = await verbindungenEintragen(home);
    const datei = await regelnSchreiben(home);
    standSchreiben(name, { stand: "fertig", schritt: "", meldung: "" });
    return { ok: true, name, verbindungen: eingetragen, regeln: datei };
  } catch (e) {
    const meldung = e instanceof Fehler ? e.message : `Unerwarteter Fehler: ${e.message}`;
    standSchreiben(name, { stand: "fehler", meldung });
    return { ok: false, name, fehler: meldung };
  }
}

// ---------- Verbindungen und Regeln ----------

/** Zusätzliche Verbindungen der installierten Addons (bisher nur earshot). */
export async function verbindungen(home = os.homedir()) {
  const earshot = await earshotPfad(home);
  return earshot ? { earshot: { command: earshot, args: ["mcp"], env: { EARSHOT_THREADS: "3" } } } : {};
}

/**
 * Trägt die Verbindungen der Addons ein: für Claude Code in .mcp.json im Studio-Ordner (gilt nur dort, Claude fragt
 * einmal nach), für Codex und Antigravity in deren Einstellungen, wenn das Studio dort eingerichtet ist.
 * Vorhandene gleichnamige Einträge bleiben, wie sie sind.
 */
export async function verbindungenEintragen(home = os.homedir()) {
  const verb = await verbindungen(home);
  if (!Object.keys(verb).length) return { claude: [], andere: [] };
  const datei = path.join(studioOrdner(), ".mcp.json");
  mkdirSync(path.dirname(datei), { recursive: true });
  const vorher = existsSync(datei) ? readFileSync(datei, "utf8") : "";
  const daten = vorher.trim() ? JSON.parse(vorher) : {};
  daten.mcpServers = daten.mcpServers && typeof daten.mcpServers === "object" ? daten.mcpServers : {};
  const claude = [];
  for (const [name, v] of Object.entries(verb)) {
    if (daten.mcpServers[name]) continue;
    daten.mcpServers[name] = v;
    claude.push(name);
  }
  if (claude.length) writeFileSync(datei, JSON.stringify(daten, null, 2) + "\n", "utf8");
  return { claude, andere: programme.zusatzEintragen(verb, { home }) };
}

export const REGELN_DATEI = "addons.md";

/** Schreibt die Regeln und Lizenzhinweise der installierten Addons nach addons.md im Studio-Ordner. */
export async function regelnSchreiben(home = os.homedir()) {
  const datei = path.join(studioOrdner(), REGELN_DATEI);
  const teile = [];
  for (const [name, a] of Object.entries(ADDONS)) {
    if (!(await istInstalliert(name, home))) continue;
    teile.push(`## ${a.titel}\n\n${a.wofuer}. Quelle: ${a.quelle} (Lizenz ${a.lizenz}).\n\n` +
      `**Regeln**\n${a.regeln.map((r) => `- ${r}`).join("\n")}\n\n**Lizenzhinweise für den Nutzer**\n${a.lizenzhinweise.map((r) => `- ${r}`).join("\n")}\n`);
  }
  if (!teile.length) return null;
  mkdirSync(path.dirname(datei), { recursive: true });
  writeFileSync(datei, "<!-- aiqora-studio:vorlage: Diese Datei schreibt das Studio beim Installieren von Addons neu. Eigene Regeln gehören in regeln.md. -->\n" +
    "# Addons im AIQORA Studio\n\nDiese Zusatzprogramme hat der Nutzer installiert. Halte dich an ihre Regeln. " +
    `Die Lizenzhinweise haben den Stand ${LIZENZ_STAND} und sind keine Rechtsberatung.\n\n${teile.join("\n")}`, "utf8");
  return datei;
}
