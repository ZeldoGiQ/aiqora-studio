// Der AIQORA-Schlüssel auf dem eigenen Rechner.
// Reihenfolge beim Lesen: in der App gespeichert → vom Plugin übergeben (Claude Code speichert ihn sicher)
// → Umgebungsvariable des Systems. Der Schlüssel wird nie angezeigt, geloggt oder an den Browser gegeben.
// Gespeichert wird verschlüsselt: Windows mit DPAPI (an das Benutzerkonto gebunden), Mac im Schlüsselbund,
// sonst in einer Datei, die nur der Benutzer lesen darf.
import { execFile, execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Fehler, alteAppDatenOrdner, appDatenOrdner, umgebung } from "./pfade.mjs";

const DIENST = "aiqora-studio";
const KONTO = "aiqora_api_key";
const FORMAT = /^[A-Za-z0-9_.-]{16,256}$/;

export function formatOk(wert) {
  return typeof wert === "string" && FORMAT.test(wert.trim());
}

function art() {
  if (umgebung("AIQORA_SCHLUESSEL_ART") === "datei") return "datei";
  if (process.platform === "win32") return "dpapi";
  if (process.platform === "darwin") return "schluesselbund";
  return "datei";
}

const dateiName = () => (art() === "dpapi" ? "schluessel.dpapi" : "schluessel");
const dateiPfad = () => path.join(appDatenOrdner(), dateiName());
const alteDateien = () => alteAppDatenOrdner().map((o) => path.join(o, dateiName())).filter((d) => d !== dateiPfad());

/** Übernimmt einen Schlüssel von einem früheren Speicherort (siehe pfade.mjs). true, wenn einer gefunden wurde. */
function altenUebernehmen() {
  const alt = alteDateien().find((d) => existsSync(d));
  if (!alt) return false;
  try {
    mkdirSync(appDatenOrdner(), { recursive: true });
    copyFileSync(alt, dateiPfad());
    try { chmodSync(dateiPfad(), 0o600); } catch { /* Windows */ }
    return true;
  } catch {
    return false;
  }
}

function mitEingabe(cmd, args, eingabe) {
  return new Promise((resolve, reject) => {
    const kind = execFile(cmd, args, { windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) reject(new Fehler("Der Schlüssel konnte nicht sicher gespeichert oder gelesen werden."));
      else resolve(String(stdout).trim());
    });
    kind.stdin.end(eingabe);
  });
}

const PS = ["-NoProfile", "-NonInteractive", "-Command"];
const PS_VERSCHLUESSELN =
  "$k=[Console]::In.ReadToEnd().Trim(); ConvertFrom-SecureString (ConvertTo-SecureString $k -AsPlainText -Force)";
const PS_ENTSCHLUESSELN =
  "$e=[Console]::In.ReadToEnd().Trim(); $s=ConvertTo-SecureString $e; " +
  "[Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))";

/** Speichert den Schlüssel sicher. Er läuft dabei nur über stdin, nie über die Befehlszeile. */
export async function speichern(wert) {
  const k = String(wert || "").trim();
  if (!formatOk(k)) throw new Fehler("Das sieht nicht wie ein AIQORA-Schlüssel aus.");
  mkdirSync(appDatenOrdner(), { recursive: true });
  switch (art()) {
    case "dpapi": {
      const verschluesselt = await mitEingabe("powershell.exe", [...PS, PS_VERSCHLUESSELN], k);
      writeFileSync(dateiPfad(), verschluesselt + "\n", { mode: 0o600 });
      break;
    }
    case "schluesselbund":
      // `security -i` liest den Befehl von stdin; das Format ist oben auf harmlose Zeichen geprüft.
      await mitEingabe("security", ["-i"], `add-generic-password -U -s ${DIENST} -a ${KONTO} -w ${k}\n`);
      break;
    default:
      writeFileSync(dateiPfad(), k + "\n", { mode: 0o600 });
      try { chmodSync(dateiPfad(), 0o600); } catch { /* Windows */ }
  }
}

/** Der in der App gespeicherte Schlüssel oder "". */
export async function gespeichert() {
  try {
    switch (art()) {
      case "dpapi":
        if (!existsSync(dateiPfad()) && !altenUebernehmen()) return "";
        return await mitEingabe("powershell.exe", [...PS, PS_ENTSCHLUESSELN], readFileSync(dateiPfad(), "utf8"));
      case "schluesselbund":
        return await new Promise((resolve) => {
          execFile("security", ["find-generic-password", "-s", DIENST, "-a", KONTO, "-w"],
            { timeout: 10000 }, (err, stdout) => resolve(err ? "" : String(stdout).trim()));
        });
      default:
        if (!existsSync(dateiPfad()) && !altenUebernehmen()) return "";
        return readFileSync(dateiPfad(), "utf8").trim();
    }
  } catch {
    return "";
  }
}

export async function loeschen() {
  if (art() === "schluesselbund") {
    await new Promise((resolve) => execFile("security", ["delete-generic-password", "-s", DIENST, "-a", KONTO], () => resolve()));
    return;
  }
  // Auch alte Kopien löschen, sonst käme der Schlüssel beim nächsten Lesen von dort zurück.
  for (const d of [dateiPfad(), ...alteDateien()]) {
    try { if (existsSync(d)) unlinkSync(d); } catch { /* weiter mit den anderen */ }
  }
}

/** Windows: dauerhaft gesetzte Benutzer-Umgebungsvariable (auch wenn der Prozess sie noch nicht kennt). */
function ausRegistry() {
  if (process.platform !== "win32") return "";
  try {
    const out = execFileSync("reg", ["query", "HKCU\\Environment", "/v", "AIQORA_API_KEY"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true, timeout: 5000 });
    const m = out.match(/AIQORA_API_KEY\s+REG_\w+\s+(.+)/);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

/**
 * Liefert { wert, quelle } oder { wert: "", quelle: null }. quelle: gespeichert | plugin | umgebung
 * Der in der App gespeicherte Schlüssel gewinnt, damit Oberfläche, lokaler Helfer und Claude Code
 * (über local/kopfzeilen.mjs) immer denselben Schlüssel nehmen.
 */
export async function finden() {
  const g = await gespeichert();
  if (g) return { wert: g, quelle: "gespeichert" };
  const plugin = umgebung("AIQORA_API_KEY");
  if (plugin) return { wert: plugin, quelle: umgebung("AIQORA_SCHLUESSEL_VOM_PLUGIN") === "1" ? "plugin" : "umgebung" };
  const reg = umgebung("AIQORA_KEIN_REGISTRY") === "1" ? "" : ausRegistry();
  if (reg) return { wert: reg, quelle: "umgebung" };
  return { wert: "", quelle: null };
}
