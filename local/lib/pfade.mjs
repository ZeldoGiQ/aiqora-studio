// Pfade des Studios und sichere Pfadprüfung.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const VORLAGE_ORDNER = path.join(PLUGIN_ROOT, "studio-vorlage");
export const SKILLS_ORDNER = path.join(PLUGIN_ROOT, "skills");
export const STUDIO_NAME = "AIQORA-Studio";

/** Liefert einen Umgebungswert oder "" (auch wenn Claude Code einen Platzhalter nicht ersetzt hat). */
export function umgebung(name) {
  const wert = (process.env[name] || "").trim();
  if (!wert || wert.startsWith("${")) return "";
  return wert;
}

let dokumenteCache;
export function dokumenteOrdner() {
  if (dokumenteCache) return dokumenteCache;
  const home = os.homedir();
  let ordner = "";
  if (process.platform === "win32") {
    try {
      ordner = execFileSync("powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", "[Environment]::GetFolderPath('MyDocuments')"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10000 }).trim();
    } catch { /* Rückfall unten */ }
  }
  if (!ordner) {
    const kandidat = path.join(home, "Documents");
    ordner = existsSync(kandidat) ? kandidat : home;
  }
  dokumenteCache = ordner;
  return ordner;
}

export function studioOrdner() {
  const eigen = umgebung("AIQORA_STUDIO_ORDNER");
  return path.resolve(eigen || path.join(dokumenteOrdner(), STUDIO_NAME));
}

/** true, wenn ziel innerhalb von basis liegt (oder basis selbst ist). */
export function liegtIn(basis, ziel) {
  const rel = path.relative(path.resolve(basis), path.resolve(ziel));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Löst einen Pfad relativ zum Studio auf und lehnt alles außerhalb ab. */
export function imStudio(eingabe) {
  if (typeof eingabe !== "string" || !eingabe.trim()) throw new Fehler("Es fehlt ein Dateipfad.");
  const studio = studioOrdner();
  const voll = path.isAbsolute(eingabe) ? path.resolve(eingabe) : path.resolve(studio, eingabe);
  if (!liegtIn(studio, voll)) throw new Fehler("Dieser Pfad liegt außerhalb des Studio-Ordners.");
  return voll;
}

const UMLAUTE = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "ae", "Ö": "oe", "Ü": "ue" };

/** Macht aus einem Namen einen sicheren Ordner- oder Dateinamen. */
export function kurzname(text, max = 40) {
  const s = String(text || "")
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTE[c])
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return s || "projekt";
}

/** Sicherer Dateiname (behält die Endung). */
export function dateiname(text) {
  const roh = path.basename(String(text || "")).replace(/[?#].*$/, "");
  const ext = path.extname(roh).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
  const stamm = kurzname(path.basename(roh, path.extname(roh)), 60);
  return stamm + ext;
}

/** Freier Dateiname: haengt -2, -3 ... an, falls die Datei schon existiert. */
export function freierPfad(voll) {
  if (!existsSync(voll)) return voll;
  const dir = path.dirname(voll), ext = path.extname(voll), stamm = path.basename(voll, ext);
  for (let i = 2; i < 10000; i++) {
    const p = path.join(dir, `${stamm}-${i}${ext}`);
    if (!existsSync(p)) return p;
  }
  throw new Fehler("Kein freier Dateiname gefunden.");
}

export function heute() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** Fehler mit einer Meldung, die dem Nutzer gezeigt werden darf. */
export class Fehler extends Error {}
