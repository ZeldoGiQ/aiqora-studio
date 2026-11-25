// Lokale Modelle finden und vorbereiten (gegen Ersatz-Server) und die feste Kostenfrage.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import http from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.AIQORA_APP_DATEN = mkdtempSync(path.join(os.tmpdir(), "aiqora-lokal-"));
delete process.env.AIQORA_LOKAL_KONTEXT;
const lokal = await import("../local/lib/lokal.mjs");
const { kostetOderLoescht } = await import("../local/lib/kosten.mjs");

const angelegt = [];
const ollama = http.createServer((req, res) => {
  let koerper = "";
  req.on("data", (d) => { koerper += d; });
  req.on("end", () => {
    const json = (o) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.url === "/api/tags") {
      return json({ models: [{ name: "qwen3:14b" }, { name: "ohne-werkzeuge:1b" }, { name: "nomic-embed-text:latest" }, { name: "aiqora-qwen3:14b" }, { name: "gross:70b" }] });
    }
    if (req.url === "/api/show") {
      const name = JSON.parse(koerper).model;
      return json({
        capabilities: name.startsWith("ohne") ? ["completion"] : ["completion", "tools"],
        model_info: { "general.architecture": "x", "x.context_length": name.startsWith("gross") ? 131072 : 16384 }
      });
    }
    if (req.url === "/api/create") { angelegt.push(JSON.parse(koerper)); return json({ status: "success" }); }
    res.writeHead(404); res.end();
  });
});

before(async () => {
  await new Promise((r) => ollama.listen(0, "127.0.0.1", r));
  process.env.AIQORA_LOKAL_OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
  process.env.AIQORA_LOKAL_LMSTUDIO_URL = "http://127.0.0.1:9"; // dort läuft nichts
  process.env.AIQORA_LOKAL_LLAMACPP_URL = "http://127.0.0.1:9";
});
after(() => ollama.close());

test("Ollama: nur Sprachmodelle mit Werkzeugen, ohne die eigenen Varianten", async () => {
  const s = await lokal.pruefen("ollama");
  assert.equal(s.laeuft, true);
  assert.deepEqual(s.modelle, [
    { name: "qwen3:14b", kontext: null, maxKontext: 16384 },
    { name: "gross:70b", kontext: null, maxKontext: 131072 }
  ]);
  assert.equal((await lokal.pruefen("lmstudio")).laeuft, false);
});

test("Ollama: Variante mit so viel Textfenster, wie das Modell kann, höchstens das Ziel", async () => {
  const s = await lokal.pruefen("ollama");
  assert.deepEqual(await lokal.vorbereiten(s, s.modelle[0]), { modell: "aiqora-qwen3:14b", kontext: 16384 });
  assert.deepEqual(await lokal.vorbereiten(s, s.modelle[1]), { modell: "aiqora-gross:70b", kontext: lokal.ZIEL_KONTEXT });
  assert.deepEqual(angelegt.map((a) => [a.model, a.from, a.parameters.num_ctx]), [
    ["aiqora-qwen3:14b", "qwen3:14b", 16384], ["aiqora-gross:70b", "gross:70b", lokal.ZIEL_KONTEXT]
  ]);
});

test("LM Studio und llama.cpp: Modelle und geladenes Textfenster lesen", () => {
  const lm = lokal.modelleLesen("lmstudio", { models: [
    { type: "llm", key: "qwen/qwen3-14b", loaded_instances: [{ id: "qwen/qwen3-14b", config: { context_length: 4096 } }] },
    { type: "llm", key: "nicht-geladen", loaded_instances: [] },
    { type: "embedding", key: "text-embedding-nomic" }
  ] });
  assert.deepEqual(lm, [
    { name: "qwen/qwen3-14b", kontext: 4096, geladenAls: "qwen/qwen3-14b" },
    { name: "nicht-geladen", kontext: null, geladenAls: null }
  ]);
  const lc = lokal.modelleLesen("llamacpp", { data: [{ id: "modell.gguf", owned_by: "llamacpp" }] }, { default_generation_settings: { n_ctx: 65536 } });
  assert.deepEqual(lc, [{ name: "modell.gguf", kontext: 65536 }]);
});

test("lokale Adressen: nur der eigene Rechner", () => {
  process.env.AIQORA_LOKAL_LLAMACPP_URL = "http://boese.example:8080";
  assert.throws(() => lokal.adressen("llamacpp"), /diesem Rechner/);
  delete process.env.AIQORA_LOKAL_LLAMACPP_URL;
  assert.deepEqual(lokal.adressen("llamacpp"), ["http://127.0.0.1:9931", "http://127.0.0.1:8080"]);
});

test("Umgebung für Claude Code: alles zeigt auf das lokale Modell, echtes Textfenster, Kostenfrage an", () => {
  const env = lokal.umgebungFuerClaude("http://127.0.0.1:11434", "aiqora-qwen3:14b", 16384);
  assert.equal(env.ANTHROPIC_BASE_URL, "http://127.0.0.1:11434");
  for (const k of ["ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"]) {
    assert.equal(env[k], "aiqora-qwen3:14b", k);
  }
  assert.equal(env.ANTHROPIC_API_KEY, "");
  assert.equal(env.CLAUDE_CODE_MAX_CONTEXT_TOKENS, "16384");
  assert.equal(env.AIQORA_LOKALES_MODELL, "1");
});

test("Verbindungen für den lokalen Start: Brücke im Sparmodus und lokaler Helfer", () => {
  const args = lokal.claudeArgumente("/programm");
  const datei = args[args.indexOf("--mcp-config") + 1];
  const { mcpServers } = JSON.parse(readFileSync(datei, "utf8"));
  assert.deepEqual(Object.keys(mcpServers), ["aiqora", "aiqora-local"]);
  assert.ok(mcpServers.aiqora.args.includes("--kompakt"));
  assert.ok(args.includes("--strict-mcp-config"));
});

test("Auswahl wird gemerkt", () => {
  assert.equal(lokal.auswahlLesen(), null);
  lokal.auswahlSpeichern("ollama", "qwen3:14b");
  assert.deepEqual(lokal.auswahlLesen(), { anbieter: "ollama", modell: "qwen3:14b" });
});

test("Kostenfrage: nur was sicher nichts kostet, ist frei", () => {
  for (const frei of ["mcp__aiqora__aiqora_whoami", "aiqora_get_credit_balance", "aiqora_list_models", "aiqora_wait_task", "aiqora_werkzeuge",
    "aiqora_beschreibung", "mcp__plugin_aiqora-studio_aiqora-local__projekt_anlegen", "byok_status", "Read"]) {
    assert.equal(kostetOderLoescht(frei), false, frei);
  }
  for (const kostet of ["mcp__plugin_aiqora-studio_aiqora__aiqora_generation_image", "aiqora_music_video_create", "aiqora_delete_asset",
    "aiqora_ganz_neues_werkzeug", "mcp__aiqora-local__byok_bild"]) {
    assert.equal(kostetOderLoescht(kostet), true, kostet);
  }
  assert.equal(kostetOderLoescht("mcp__aiqora__aiqora_aufruf", { name: "aiqora_get_quote" }), false);
  assert.equal(kostetOderLoescht("mcp__aiqora__aiqora_aufruf", { name: "aiqora_generation_music" }), true);
  assert.equal(kostetOderLoescht("mcp__aiqora__aiqora_aufruf", {}), true, "ohne Namen lieber fragen");
});

test("Kostenfrage-Skript: fragt nur mit lokalem Modell und nur bei Aufträgen, die kosten können", () => {
  const skript = fileURLToPath(new URL("../local/kostenfrage.mjs", import.meta.url));
  const lauf = (eingabe, lokalesModell) => execFileSync(process.execPath, [skript], {
    input: JSON.stringify(eingabe), encoding: "utf8", env: { ...process.env, AIQORA_LOKALES_MODELL: lokalesModell ? "1" : "" }
  });
  const kostet = { tool_name: "mcp__aiqora__aiqora_aufruf", tool_input: { name: "aiqora_generation_image", eingaben: {} } };
  assert.equal(lauf(kostet, false), "", "mit Claude tut das Skript nichts");
  assert.equal(JSON.parse(lauf(kostet, true)).hookSpecificOutput.permissionDecision, "ask");
  assert.equal(lauf({ tool_name: "mcp__aiqora__aiqora_aufruf", tool_input: { name: "aiqora_whoami" } }, true), "");
  assert.equal(lauf({ tool_name: "mcp__aiqora-local__studio_info", tool_input: {} }, true), "");
});
