// Lokale Modelle: Ollama, LM Studio und llama.cpp auf dem eigenen Rechner finden und vorbereiten.
// Alle drei laufen als kleiner Server auf 127.0.0.1 und sprechen dieselbe Sprache wie Claude
// (Anthropic-Schnittstelle unter /v1/messages). Claude Code lässt sich deshalb auf sie umleiten.
// Ein lokales Modell ersetzt nur das Sprachmodell. Bilder, Videos und Musik kommen weiter von AIQORA.
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PLUGIN_ROOT, appDatenOrdner, umgebung } from "./pfade.mjs";

/**
 * Textfenster in Tokens: so viel kann das Modell auf einmal überblicken. Mit dem schlanken Start (siehe
 * claudeArgumente) schickt Claude Code rund 9.000 Tokens für Anleitung und Werkzeuge mit. Das Studio lädt
 * Modelle mit ZIEL_KONTEXT, wenn sie so viel können: genug Platz für einen Auftrag, und auf Grafikkarten mit
 * 12 bis 16 GB bleibt das Modell noch schnell. Ein größeres Fenster braucht mehr Speicher und wird langsamer.
 * Unter MIN_KONTEXT vergisst das Modell mitten im Auftrag die Regeln; dann wird gewarnt.
 * AIQORA_LOKAL_KONTEXT setzt einen eigenen Wert.
 */
export const ZIEL_KONTEXT = Number(umgebung("AIQORA_LOKAL_KONTEXT")) >= 8000 ? Number(umgebung("AIQORA_LOKAL_KONTEXT")) : 32000;
export const MIN_KONTEXT = 24000;

// llama.cpp: 9931 ist der Standard seit Oktober 2026, ältere Versionen nehmen 8080.
export const ANBIETER = {
  ollama: { titel: "Ollama", ports: [11434], seite: "https://ollama.com/download" },
  lmstudio: { titel: "LM Studio", ports: [1234], seite: "https://lmstudio.ai" },
  llamacpp: { titel: "llama.cpp", ports: [9931, 8080], seite: "https://github.com/ggml-org/llama.cpp" }
};

// Varianten, die das Studio in Ollama mit großem Textfenster anlegt, tragen diesen Vorsatz.
const OLLAMA_VORSATZ = "aiqora-";

/** Adressen, unter denen der Server des Anbieters laufen kann. Nur der eigene Rechner ist erlaubt. */
export function adressen(anbieter) {
  const eigen = umgebung(`AIQORA_LOKAL_${anbieter.toUpperCase()}_URL`);
  if (!eigen) return ANBIETER[anbieter].ports.map((p) => `http://127.0.0.1:${p}`);
  const u = new URL(eigen);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)) {
    throw new Error("Die Adresse des lokalen Modells muss auf diesem Rechner liegen (127.0.0.1).");
  }
  return [u.origin];
}

async function holen(url, optionen = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(optionen.zeitlimitMs || 2500), ...optionen });
  if (!r.ok) throw new Error(`Status ${r.status}`);
  return r.json();
}

const istSprachmodell = (name) => typeof name === "string" && name && !/embed/i.test(name);

/**
 * Modelle aus den Antworten der Server lesen: [{ name, kontext, … }].
 * kontext ist das Textfenster, mit dem das Modell gerade geladen ist, oder null, wenn das nicht bekannt ist.
 * Ollama (zusatz = Antworten von /api/show je Modell): maxKontext ist das größte Fenster, das das Modell kann;
 * Modelle, die keine Werkzeuge aufrufen können, fallen weg, denn ohne Werkzeuge kann das Studio nichts erzeugen.
 */
export function modelleLesen(anbieter, daten, zusatz) {
  if (anbieter === "ollama") {
    return (daten?.models || []).map((m) => m?.name || m?.model)
      .filter((n) => istSprachmodell(n) && !n.startsWith(OLLAMA_VORSATZ))
      .filter((name) => !Array.isArray(zusatz?.[name]?.capabilities) || zusatz[name].capabilities.includes("tools"))
      .map((name) => {
        const info = Object.entries(zusatz?.[name]?.model_info || {}).find(([k]) => /^[^.]+\.context_length$/.test(k));
        return { name, kontext: null, maxKontext: Number(info?.[1]) || null };
      });
  }
  if (anbieter === "lmstudio" && Array.isArray(daten?.models)) {
    return daten.models.filter((m) => m?.type === "llm" && istSprachmodell(m.key)).map((m) => {
      const geladen = (m.loaded_instances || [])[0];
      return { name: m.key, kontext: geladen?.config?.context_length ?? null, geladenAls: geladen?.id || null };
    });
  }
  // OpenAI-Form (llama.cpp, ältere LM-Studio-Versionen)
  const kontext = zusatz?.default_generation_settings?.n_ctx ?? null;
  return (daten?.data || []).map((m) => m?.id).filter(istSprachmodell).map((name) => ({ name, kontext }));
}

/** Läuft der Server des Anbieters, und welche Modelle bietet er an? */
export async function pruefen(anbieter) {
  for (const basis of adressen(anbieter)) {
    try {
      let daten, zusatz;
      if (anbieter === "ollama") {
        daten = await holen(basis + "/api/tags");
        zusatz = {};
        await Promise.all((daten?.models || []).map(async (m) => {
          const name = m?.name || m?.model;
          zusatz[name] = await holen(basis + "/api/show", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: name }), zeitlimitMs: 8000
          }).catch(() => null);
        }));
      } else if (anbieter === "lmstudio") {
        daten = await holen(basis + "/api/v1/models").catch(() => holen(basis + "/v1/models"));
      } else {
        daten = await holen(basis + "/v1/models");
        if (daten?.data?.[0]?.owned_by !== "llamacpp") continue; // auf dem Port läuft etwas anderes
        zusatz = await holen(basis + "/props").catch(() => null);
      }
      return { anbieter, basis, laeuft: true, modelle: modelleLesen(anbieter, daten, zusatz) };
    } catch { /* nächste Adresse */ }
  }
  return { anbieter, basis: adressen(anbieter)[0], laeuft: false, modelle: [] };
}

export async function erkennen() {
  return Promise.all(Object.keys(ANBIETER).map(pruefen));
}

// ---------- Programme finden und starten ----------

function ausfuehren(programm, args, zeitlimitMs = 120000) {
  return new Promise((resolve) => {
    execFile(programm, args, { windowsHide: true, timeout: zeitlimitMs }, (err, stdout) => resolve({ ok: !err, ausgabe: String(stdout || "") }));
  });
}

async function programmPfad(name, weitereOrte = []) {
  const { ok, ausgabe } = await ausfuehren(process.platform === "win32" ? "where.exe" : "which", [name], 5000);
  const treffer = ok ? ausgabe.split(/\r?\n/).map((z) => z.trim()).find(Boolean) || "" : "";
  return treffer || weitereOrte.find((o) => existsSync(o)) || "";
}

/** Wo liegt das Programm, mit dem sich der Server des Anbieters steuern lässt? "" wenn es fehlt. */
export function startProgramm(anbieter) {
  const home = os.homedir();
  const lokal = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  if (anbieter === "ollama") {
    return programmPfad("ollama", [path.join(lokal, "Programs", "Ollama", "ollama.exe"), "/usr/local/bin/ollama", "/opt/homebrew/bin/ollama"]);
  }
  if (anbieter === "lmstudio") {
    return programmPfad("lms", [path.join(home, ".lmstudio", "bin", process.platform === "win32" ? "lms.exe" : "lms")]);
  }
  return Promise.resolve(""); // llama.cpp startet der Nutzer selbst mit seinem Modell
}

/** Startet den Server eines installierten Anbieters im Hintergrund und wartet, bis er antwortet. */
export async function serverStarten(anbieter, warteMs = 30000) {
  const programm = await startProgramm(anbieter);
  if (!programm) return false;
  try {
    const kind = spawn(programm, anbieter === "ollama" ? ["serve"] : ["server", "start"],
      { detached: true, stdio: "ignore", windowsHide: true });
    kind.on("error", () => {});
    kind.unref();
  } catch {
    return false;
  }
  const ende = Date.now() + warteMs;
  while (Date.now() < ende) {
    if ((await pruefen(anbieter)).laeuft) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ---------- Modell mit großem Textfenster bereitstellen ----------

/** Name der Ollama-Variante mit großem Textfenster, z. B. qwen3:14b → aiqora-qwen3:14b. */
export function ollamaVariante(modell) {
  return OLLAMA_VORSATZ + modell.replace(/[^A-Za-z0-9._:-]/g, "-");
}

/**
 * Sorgt dafür, dass das Modell mit genug Textfenster läuft, und liefert { modell, kontext }:
 * den Namen, unter dem Claude Code es anspricht, und das Textfenster (null, wenn unbekannt).
 * - Ollama nimmt sonst je nach Grafikkarte nur 4.000 Tokens. Das Studio legt deshalb eine Variante des
 *   Modells an, die nur die Einstellung ändert (so groß, wie das Modell es kann, höchstens ZIEL_KONTEXT).
 *   Sie braucht keinen zusätzlichen Speicherplatz.
 * - LM Studio lädt das Modell neu, wenn es mit zu kleinem Fenster geladen ist.
 * - llama.cpp: das Fenster legt der Nutzer beim Start fest (-c). Hier wird nur gemeldet, wie groß es ist.
 */
export async function vorbereiten(status, eintrag) {
  const { anbieter, basis } = status;
  if (anbieter === "ollama") {
    const variante = ollamaVariante(eintrag.name);
    const fenster = Math.min(ZIEL_KONTEXT, eintrag.maxKontext || ZIEL_KONTEXT);
    await holen(basis + "/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: variante, from: eintrag.name, parameters: { num_ctx: fenster }, stream: false }),
      zeitlimitMs: 120000
    });
    return { modell: variante, kontext: fenster };
  }
  if (anbieter === "lmstudio") {
    if (eintrag.kontext >= ZIEL_KONTEXT) return { modell: eintrag.geladenAls || eintrag.name, kontext: eintrag.kontext };
    const lms = await startProgramm("lmstudio");
    if (!lms) return { modell: eintrag.geladenAls || eintrag.name, kontext: eintrag.kontext };
    if (eintrag.geladenAls) await ausfuehren(lms, ["unload", eintrag.geladenAls]);
    const geladen = await ausfuehren(lms, ["load", eintrag.name, "--context-length", String(ZIEL_KONTEXT), "--identifier", eintrag.name, "--gpu", "max"], 600000);
    return { modell: eintrag.name, kontext: geladen.ok ? ZIEL_KONTEXT : null };
  }
  return { modell: eintrag.name, kontext: eintrag.kontext };
}

// ---------- Auswahl merken ----------

const auswahlDatei = () => path.join(appDatenOrdner(), "lokal.json");

export function auswahlLesen() {
  try {
    const a = JSON.parse(readFileSync(auswahlDatei(), "utf8"));
    return ANBIETER[a?.anbieter] && typeof a.modell === "string" ? { anbieter: a.anbieter, modell: a.modell } : null;
  } catch {
    return null;
  }
}

export function auswahlSpeichern(anbieter, modell) {
  mkdirSync(appDatenOrdner(), { recursive: true });
  writeFileSync(auswahlDatei(), JSON.stringify({ anbieter, modell }) + "\n", "utf8");
}

// ---------- Umgebung für Claude Code ----------

/**
 * Umgebungsvariablen, mit denen Claude Code das lokale Modell statt Claude benutzt.
 * - Alle Modellstufen zeigen auf dasselbe Modell, damit keine Anfrage doch zu Anthropic geht.
 * - Claude Code hält unbekannte Modelle für sehr groß. Das echte Textfenster wird deshalb mitgegeben,
 *   sonst kürzt es das Gespräch nie und das Modell bricht irgendwann ab.
 * - Zusätze, die nur Anthropic versteht (Beta-Felder, Denk-Blöcke, Abrechnungskopf), sind abgeschaltet.
 * - AIQORA_LOKALES_MODELL schaltet die feste Kostenfrage ein (siehe local/kostenfrage.mjs).
 */
export function umgebungFuerClaude(basis, modell, kontext) {
  const fenster = Number(kontext) > 0 ? Number(kontext) : ZIEL_KONTEXT;
  return {
    ANTHROPIC_BASE_URL: basis,
    ANTHROPIC_AUTH_TOKEN: "lokal",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_MODEL: modell,
    ANTHROPIC_DEFAULT_OPUS_MODEL: modell,
    ANTHROPIC_DEFAULT_SONNET_MODEL: modell,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: modell,
    CLAUDE_CODE_SUBAGENT_MODEL: modell,
    CLAUDE_CODE_MAX_CONTEXT_TOKENS: String(fenster),
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(Math.min(8192, Math.floor(fenster / 4))),
    CLAUDE_CODE_ATTRIBUTION_HEADER: "0",
    CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: "1",
    CLAUDE_CODE_DISABLE_THINKING: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_ERROR_REPORTING: "1",
    API_TIMEOUT_MS: "1800000",
    AIQORA_LOKALES_MODELL: "1"
  };
}

/**
 * Schreibt die Verbindungen für den lokalen Start in eine Datei und liefert ihren Pfad.
 * AIQORA läuft dabei über die Brücke im Sparmodus: Das Modell sieht drei kleine Werkzeuge statt aller
 * AIQORA-Werkzeuge, die zusammen schon rund 30.000 Tokens brauchen würden.
 */
export function verbindungsDatei(wurzel = PLUGIN_ROOT) {
  const datei = path.join(appDatenOrdner(), "lokal-mcp.json");
  mkdirSync(appDatenOrdner(), { recursive: true });
  writeFileSync(datei, JSON.stringify({
    mcpServers: {
      aiqora: { command: process.execPath, args: [path.join(wurzel, "local", "bruecke.mjs"), "--kompakt"] },
      "aiqora-local": { command: process.execPath, args: [path.join(wurzel, "local", "server.mjs")] }
    }
  }, null, 2) + "\n", "utf8");
  return datei;
}

/**
 * Zusätzliche Angaben für Claude Code, damit möglichst wenig Text an das lokale Modell geht:
 * nur die zwei Verbindungen des Studios, nur das Studio als Plugin, keine persönlichen Einstellungen
 * (andere Plugins und Verbindungen des Nutzers würden das Textfenster füllen) und nur die Werkzeuge,
 * die das Studio braucht.
 */
export function claudeArgumente(wurzel = PLUGIN_ROOT) {
  return [
    "--strict-mcp-config", "--mcp-config", verbindungsDatei(wurzel),
    "--setting-sources", "project,local",
    "--plugin-dir", wurzel,
    "--tools", "Read,Write,Edit,Glob,Skill,AskUserQuestion"
  ];
}

/** Namen aus umgebungFuerClaude, die eine Claude-Einstellungsdatei überschreiben würde (dort gewinnt die Datei). */
export function ueberschriebenVonEinstellungen() {
  try {
    const env = JSON.parse(readFileSync(path.join(os.homedir(), ".claude", "settings.json"), "utf8")).env || {};
    return Object.keys(env).filter((k) => /^ANTHROPIC_(BASE_URL|AUTH_TOKEN|API_KEY|MODEL)$/.test(k));
  } catch {
    return [];
  }
}
