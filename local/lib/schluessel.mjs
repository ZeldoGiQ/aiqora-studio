// Der AIQORA-Schlüssel auf dem eigenen Rechner.
// Reihenfolge beim Lesen: vom Plugin übergeben (Claude Code speichert ihn sicher) → in der App gespeichert
// → Umgebungsvariable des Systems. Der Schlüssel wird nie angezeigt, geloggt oder an den Browser gegeben.
// Gespeichert wird verschlüsselt: Windows mit DPAPI (an das Benutzerkonto gebunden), Mac im Schlüsselbund,
// sonst in einer Datei, die nur der Benutzer lesen darf.
import { execFile, execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Fehler, appDatenOrdner, umgebung } from "./pfade.mjs";

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

const dateiPfad = () => path.join(appDatenOrdner(), art() === "dpapi" ? "schluessel.dpapi" : "schluessel");

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
        if (!existsSync(dateiPfad())) return "";
        return await mitEingabe("powershell.exe", [...PS, PS_ENTSCHLUESSELN], readFileSync(dateiPfad(), "utf8"));
      case "schluesselbund":
        return await new Promise((resolve) => {
          execFile("security", ["find-generic-password", "-s", DIENST, "-a", KONTO, "-w"],
            { timeout: 10000 }, (err, stdout) => resolve(err ? "" : String(stdout).trim()));
        });
      default:
        return existsSync(dateiPfad()) ? readFileSync(dateiPfad(), "utf8").trim() : "";
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
  if (existsSync(dateiPfad())) unlinkSync(dateiPfad());
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

/** Liefert { wert, quelle } oder { wert: "", quelle: null }. quelle: plugin | gespeichert | umgebung */
export async function finden() {
  const plugin = umgebung("AIQORA_API_KEY");
  if (plugin && umgebung("AIQORA_SCHLUESSEL_VOM_PLUGIN") === "1") return { wert: plugin, quelle: "plugin" };
  const g = await gespeichert();
  if (g) return { wert: g, quelle: "gespeichert" };
  if (plugin) return { wert: plugin, quelle: "umgebung" };
  const reg = umgebung("AIQORA_KEIN_REGISTRY") === "1" ? "" : ausRegistry();
  if (reg) return { wert: reg, quelle: "umgebung" };
  return { wert: "", quelle: null };
}
