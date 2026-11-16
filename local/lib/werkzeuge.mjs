// Die Werkzeuge des lokalen Helfers: Name, Beschreibung, Eingabe-Schema, Ausführung.
import { Fehler, studioOrdner } from "./pfade.mjs";
import * as studio from "./studio.mjs";
import * as dateien from "./dateien.mjs";
import * as schnitt from "./schnitt.mjs";
import * as byok from "./byok.mjs";

const s = (description) => ({ type: "string", description });
const n = (description) => ({ type: "number", description });
const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });

export const WERKZEUGE = [
  {
    name: "studio_info",
    description: "Zeigt den Studio-Ordner, ob er eingerichtet ist, die Studio-Version und ob ffmpeg verfügbar ist.",
    inputSchema: obj({}),
    run: async () => ({
      studio_ordner: studioOrdner(),
      eingerichtet: studio.istEingerichtet(),
      version: studio.version(),
      ffmpeg: await schnitt.ffmpegVerfuegbar(),
      plattform: process.platform
    })
  },
  {
    name: "studio_einrichten",
    description: "Legt den Studio-Ordner an bzw. aktualisiert ihn (Anleitung, Dashboard). Eigene Regeln und Dashboard-Daten des Nutzers bleiben erhalten.",
    inputSchema: obj({}),
    run: async () => studio.einrichten()
  },
  {
    name: "projekt_anlegen",
    description: "Legt für ein Vorhaben einen Projektordner an (mit bilder, clips, audio, fertig und notizen.md). Gibt den Projektnamen zurück, der bei den anderen Werkzeugen als 'projekt' angegeben wird.",
    inputSchema: obj({ name: s("Kurzer Name des Vorhabens, z. B. 'Weihnachts-Musikvideo'") }, ["name"]),
    run: async ({ name }) => studio.projektAnlegen(name)
  },
  {
    name: "projekte_liste",
    description: "Listet die Projekte im Studio, neueste zuerst.",
    inputSchema: obj({}),
    run: async () => ({ projekte: studio.projekteListe() })
  },
  {
    name: "datei_herunterladen",
    description: "Lädt eine Datei (z. B. ein fertiges Ergebnis von AIQORA) über https in den Projektordner. Ohne 'unterordner' wird nach Dateityp sortiert (bilder, clips, audio).",
    inputSchema: obj({
      url: s("https-Adresse der Datei"),
      projekt: s("Projektname aus projekt_anlegen (optional; sonst Ordner 'downloads')"),
      unterordner: s("bilder, clips, audio oder fertig (optional)"),
      dateiname: s("Gewünschter Dateiname (optional)")
    }, ["url"]),
    run: async (a) => dateien.herunterladen(a)
  },
  {
    name: "datei_hochladen",
    description: "Lädt eine Datei des Nutzers zu AIQORA hoch. Erst beim AIQORA-Server eine Upload-Adresse holen, dann dieses Werkzeug mit der Adresse aufrufen. Lädt nur zu AIQORA hoch, nie woandershin.",
    inputSchema: obj({
      pfad: s("Pfad der Datei auf diesem Rechner"),
      upload_url: s("Upload-Adresse vom AIQORA-Server"),
      methode: { type: "string", enum: ["PUT", "POST"], description: "Wie der AIQORA-Server es vorgibt (Standard PUT)" },
      content_type: s("Dateityp, falls der AIQORA-Server einen vorgibt (optional)"),
      felder: { type: "object", description: "Zusätzliche Formularfelder bei POST, wie vom AIQORA-Server vorgegeben (optional)", additionalProperties: { type: "string" } },
      datei_feld: s("Name des Datei-Felds bei POST (Standard 'file')")
    }, ["pfad", "upload_url"]),
    run: async (a) => dateien.hochladen(a)
  },
  {
    name: "datei_oeffnen",
    description: "Öffnet eine Datei aus dem Studio-Ordner mit dem Standardprogramm (Video, Bild, Song, Dashboard).",
    inputSchema: obj({ pfad: s("Pfad der Datei (im Studio-Ordner)") }, ["pfad"]),
    run: async ({ pfad }) => dateien.oeffnen(pfad)
  },
  {
    name: "datei_info",
    description: "Zeigt Länge, Größe, Auflösung und Tonformat einer Bild-, Video- oder Audiodatei (braucht ffmpeg).",
    inputSchema: obj({ pfad: s("Pfad der Datei") }, ["pfad"]),
    run: async ({ pfad }) => schnitt.info(pfad)
  },
  {
    name: "schnitt_kuerzen",
    description: "Schneidet einen Ausschnitt aus einem Video oder Song (braucht ffmpeg). Die Originaldatei bleibt erhalten.",
    inputSchema: obj({
      eingabe: s("Datei im Studio-Ordner"),
      start: n("Start in Sekunden"),
      ende: n("Ende in Sekunden"),
      ausgabe: s("Name der neuen Datei im Studio-Ordner (optional)")
    }, ["eingabe", "start", "ende"]),
    run: async (a) => schnitt.kuerzen(a)
  },
  {
    name: "schnitt_zusammenfuegen",
    description: "Hängt Clips aneinander, optional mit einer eigenen Tonspur darunter (dann ist der Ton der Clips stumm). Braucht ffmpeg.",
    inputSchema: obj({
      eingaben: { type: "array", items: { type: "string" }, description: "Clips in der gewünschten Reihenfolge (im Studio-Ordner)" },
      tonspur: s("Song oder Tonspur, die durchgehend darunter läuft (optional)"),
      ausgabe: s("Name der neuen Datei (optional)")
    }, ["eingaben"]),
    run: async (a) => schnitt.zusammenfuegen(a)
  },
  {
    name: "schnitt_hochkant",
    description: "Macht aus einem Breitbild-Video eine Hochkant-Version 9:16 (1080×1920), mittig zugeschnitten. Braucht ffmpeg.",
    inputSchema: obj({ eingabe: s("Video im Studio-Ordner"), ausgabe: s("Name der neuen Datei (optional)") }, ["eingabe"]),
    run: async (a) => schnitt.hochkant(a)
  },
  {
    name: "schnitt_lautheit",
    description: "Gleicht die Lautstärke eines Videos oder Songs an (Standard −14 LUFS, passend für YouTube und TikTok). Braucht ffmpeg.",
    inputSchema: obj({
      eingabe: s("Datei im Studio-Ordner"),
      ziel_lufs: n("Ziel-Lautheit (Standard −14)"),
      ausgabe: s("Name der neuen Datei (optional)")
    }, ["eingabe"]),
    run: async (a) => schnitt.lautheit(a)
  },
  {
    name: "dashboard_aktualisieren",
    description: "Aktualisiert das Dashboard. Nur angegebene Felder werden geändert; Listen werden komplett ersetzt.",
    inputSchema: obj({
      credits: { type: ["number", "null"], description: "Aktuelles Guthaben" },
      reichtFuer: s("Wofür das Guthaben ungefähr reicht"),
      tipp: s("Ein Tipp für den Nutzer"),
      jobs: { type: "array", items: { type: "object" }, description: "Letzte Aufträge: { name, status: ok|laeuft|fehler, credits, datei }" },
      projekte: { type: "array", items: { type: "object" }, description: "Projekte: { name, ordner, stand }" },
      modelle: { type: "array", items: { type: "object" }, description: "Was AIQORA kann: { name, art, credits }" }
    }),
    run: async (a) => studio.dashboardAktualisieren(a)
  },
  {
    name: "byok_status",
    description: "Zeigt, für welche Anbieter ein eigener Schlüssel eingetragen ist. Zeigt nie den Wert eines Schlüssels.",
    inputSchema: obj({}),
    run: async () => byok.status()
  },
  {
    name: "byok_bild",
    description: "Erzeugt ein einfaches Einzelbild mit dem eigenen Schlüssel des Nutzers direkt beim Anbieter (nur mit AIQORA-Abo). Der Text geht unverändert an den Anbieter.",
    inputSchema: obj({ prompt: s("Was auf dem Bild sein soll"), anbieter: s("wavespeed oder fal (optional)"), abo_nachweis: s("Abo-Nachweis vom AIQORA-Server") }, ["prompt"]),
    run: async (a) => byok.erzeugen({ ...a, art: "bild" })
  },
  {
    name: "byok_clip",
    description: "Erzeugt einen einfachen Einzelclip mit dem eigenen Schlüssel des Nutzers direkt beim Anbieter (nur mit AIQORA-Abo).",
    inputSchema: obj({ prompt: s("Was im Clip passieren soll"), anbieter: s("wavespeed oder fal (optional)"), abo_nachweis: s("Abo-Nachweis vom AIQORA-Server") }, ["prompt"]),
    run: async (a) => byok.erzeugen({ ...a, art: "clip" })
  },
  {
    name: "byok_stimme",
    description: "Erzeugt eine Sprachaufnahme mit dem eigenen Schlüssel des Nutzers direkt beim Anbieter (nur mit AIQORA-Abo).",
    inputSchema: obj({ prompt: s("Der zu sprechende Text"), anbieter: s("elevenlabs (optional)"), abo_nachweis: s("Abo-Nachweis vom AIQORA-Server") }, ["prompt"]),
    run: async (a) => byok.erzeugen({ ...a, art: "stimme" })
  }
];

const TYPEN = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && Number.isFinite(v),
  boolean: (v) => typeof v === "boolean",
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  null: (v) => v === null
};

/** Einfache Prüfung der Eingaben gegen das Schema (Pflichtfelder, Typen, unbekannte Felder). */
export function pruefeEingaben(schema, args) {
  const a = args ?? {};
  if (!TYPEN.object(a)) throw new Fehler("Die Eingaben müssen ein Objekt sein.");
  for (const pflicht of schema.required || []) {
    if (a[pflicht] === undefined || a[pflicht] === "") throw new Fehler(`Es fehlt die Angabe „${pflicht}“.`);
  }
  for (const [k, v] of Object.entries(a)) {
    const feld = schema.properties?.[k];
    if (!feld) throw new Fehler(`Unbekannte Angabe „${k}“.`);
    const typen = [].concat(feld.type);
    if (!typen.some((t) => TYPEN[t]?.(v))) throw new Fehler(`„${k}“ hat den falschen Typ (erwartet: ${typen.join(" oder ")}).`);
    if (feld.enum && !feld.enum.includes(v)) throw new Fehler(`„${k}“ muss eins davon sein: ${feld.enum.join(", ")}.`);
    if (feld.type === "array" && feld.items?.type) {
      if (!v.every((x) => TYPEN[feld.items.type]?.(x))) throw new Fehler(`„${k}“ enthält Einträge mit falschem Typ.`);
    }
  }
  return a;
}
