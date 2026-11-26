// Herunterladen, Hochladen (nur zu AIQORA), Öffnen, Datei-Infos.
import { createWriteStream, existsSync, mkdirSync, openAsBlob, statSync, unlinkSync } from "node:fs";
import { execFile } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { Fehler, dateiname, freierPfad, imStudio, studioOrdner, umgebung } from "./pfade.mjs";
import { projektPfad } from "./studio.mjs";
import * as erzeugt from "./erzeugt.mjs";

const STANDARD_UPLOAD_HOSTS = [".supabase.co", "aiqora.ai", ".aiqora.ai"];
const MAX_UPLOAD_BYTES = 2 * 1024 ** 3; // 2 GB

export function pruefeHttps(url, wofuer = "Der Link") {
  let u;
  try { u = new URL(url); } catch { throw new Fehler(`${wofuer} ist keine gültige Adresse.`); }
  if (u.protocol !== "https:") throw new Fehler(`${wofuer} muss mit https:// beginnen.`);
  return u;
}

/** Uploads gehen nur an AIQORA (Standard) oder an ausdrücklich erlaubte Hosts. */
export function uploadErlaubt(url) {
  const u = pruefeHttps(url, "Die Upload-Adresse");
  const eigen = umgebung("AIQORA_UPLOAD_HOSTS");
  const liste = eigen ? eigen.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : STANDARD_UPLOAD_HOSTS;
  const host = u.hostname.toLowerCase();
  const ok = liste.some((h) => (h.startsWith(".") ? host.endsWith(h) && host.length > h.length : host === h));
  if (!ok) throw new Fehler("Hochladen geht nur zu AIQORA. Diese Upload-Adresse gehört nicht zu AIQORA.");
  return u;
}

const TYP_ORDNER = [
  [/^image\//, "bilder"], [/^video\//, "clips"], [/^audio\//, "audio"]
];
const ENDUNG_TYP = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".flac": "audio/flac",
  ".json": "application/json", ".txt": "text/plain", ".pdf": "application/pdf"
};
const TYP_ENDUNG = Object.fromEntries(Object.entries(ENDUNG_TYP).map(([e, t]) => [t, e]));

export function typVonEndung(p) {
  return ENDUNG_TYP[path.extname(p).toLowerCase()] || "application/octet-stream";
}

export async function herunterladen({ url, projekt, unterordner, dateiname: wunschName, modell, credits, auftrag }) {
  const u = pruefeHttps(url);
  let zielOrdner;
  if (projekt) projektPfad(projekt); // prüft vor dem Herunterladen, ob es das Projekt gibt
  const antwort = await fetch(u, { redirect: "follow" });
  if (!antwort.ok || !antwort.body) throw new Fehler(`Herunterladen fehlgeschlagen (Status ${antwort.status}).`);
  const typ = (antwort.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (projekt) {
    const auto = TYP_ORDNER.find(([re]) => re.test(typ))?.[1] || "";
    zielOrdner = projektPfad(projekt, unterordner || auto);
  } else {
    zielOrdner = imStudio("downloads");
    mkdirSync(zielOrdner, { recursive: true });
  }
  let name = dateiname(wunschName || decodeURIComponent(u.pathname.split("/").pop() || "datei"));
  if (!path.extname(name) && TYP_ENDUNG[typ]) name += TYP_ENDUNG[typ];
  const ziel = freierPfad(path.join(zielOrdner, name));
  try {
    await pipeline(Readable.fromWeb(antwort.body), createWriteStream(ziel));
  } catch (e) {
    if (existsSync(ziel)) unlinkSync(ziel);
    throw new Fehler("Herunterladen wurde unterbrochen.");
  }
  const ergebnis = { pfad: ziel, bytes: statSync(ziel).size, typ: typ || typVonEndung(ziel) };
  // Womit erzeugt und was es gekostet hat: steht danach in der Oberfläche bei der Datei.
  const merk = projekt ? erzeugt.merken(projektPfad(projekt), ziel, { modell, credits, auftrag }) : null;
  return merk ? { ...ergebnis, erzeugt_mit: merk } : ergebnis;
}

export async function hochladen({ pfad, upload_url, methode = "PUT", content_type, felder, datei_feld = "file" }) {
  const u = uploadErlaubt(upload_url);
  if (typeof pfad !== "string" || !pfad.trim()) throw new Fehler("Bitte den Pfad der Datei angeben.");
  // Lesen ist überall erlaubt (der Nutzer zieht Dateien aus beliebigen Ordnern hinein),
  // weil das Ziel auf AIQORA beschränkt ist (uploadErlaubt).
  const voll = path.isAbsolute(pfad) ? path.resolve(pfad) : path.resolve(studioOrdner(), pfad);
  if (!existsSync(voll) || !statSync(voll).isFile()) throw new Fehler("Die Datei gibt es nicht.");
  const groesse = statSync(voll).size;
  if (groesse > MAX_UPLOAD_BYTES) throw new Fehler("Die Datei ist größer als 2 GB.");
  const typ = content_type || typVonEndung(voll);
  const blob = await openAsBlob(voll, { type: typ });
  let antwort;
  const m = String(methode).toUpperCase();
  if (m === "PUT") {
    antwort = await fetch(u, { method: "PUT", body: blob, headers: { "Content-Type": typ } });
  } else if (m === "POST") {
    const form = new FormData();
    for (const [k, v] of Object.entries(felder || {})) form.append(k, String(v));
    form.append(datei_feld, blob, path.basename(voll));
    antwort = await fetch(u, { method: "POST", body: form });
  } else {
    throw new Fehler("methode muss PUT oder POST sein.");
  }
  if (!antwort.ok) throw new Fehler(`Hochladen fehlgeschlagen (Status ${antwort.status}).`);
  return { hochgeladen: true, bytes: groesse, typ };
}

export function oeffnen(pfad) {
  const voll = imStudio(pfad);
  if (!existsSync(voll)) throw new Fehler("Die Datei gibt es nicht.");
  const [cmd, args] = process.platform === "win32" ? ["explorer.exe", [voll]]
    : process.platform === "darwin" ? ["open", [voll]] : ["xdg-open", [voll]];
  const kind = execFile(cmd, args, { windowsHide: true }, () => { /* explorer.exe meldet oft Code 1 */ });
  kind.unref();
  return { geoeffnet: voll };
}
