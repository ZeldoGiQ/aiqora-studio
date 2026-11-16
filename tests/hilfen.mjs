// Startet den lokalen Helfer als eigenen Prozess und spricht MCP mit ihm.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function tempStudio() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "aiqora-test-")), "Studio");
}

export function starteHelfer(env = {}) {
  const kind = spawn(process.execPath, [path.join(ROOT, "local", "server.mjs")], {
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"]
  });
  let stderr = "";
  kind.stderr.on("data", (d) => { stderr += d; });
  const offen = new Map();
  const ausgaben = [];
  readline.createInterface({ input: kind.stdout }).on("line", (zeile) => {
    ausgaben.push(zeile);
    const m = JSON.parse(zeile);
    if (offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); }
  });
  let naechsteId = 1;
  const anfrage = (method, params) => new Promise((resolve, reject) => {
    const id = naechsteId++;
    const timer = setTimeout(() => reject(new Error(`Keine Antwort auf ${method}`)), 60000);
    offen.set(id, (m) => { clearTimeout(timer); resolve(m); });
    kind.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
  const notiz = (method, params) => kind.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  const aufruf = async (name, args = {}) => {
    const m = await anfrage("tools/call", { name, arguments: args });
    const t = m.result.content[0].text;
    let daten; try { daten = JSON.parse(t); } catch { daten = t; }
    return { fehler: Boolean(m.result.isError), text: t, daten };
  };
  const beenden = () => new Promise((resolve) => { kind.on("exit", resolve); kind.stdin.end(); });
  return { anfrage, notiz, aufruf, beenden, alleAusgaben: () => ausgaben.join("\n"), stderr: () => stderr };
}
