// Die Werkzeuge des lokalen Helfers: Name, Beschreibung, Eingabe-Schema, Ausführung.
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { Fehler, PLUGIN_ROOT, studioOrdner } from "./pfade.mjs";
import * as studio from "./studio.mjs";
import * as dateien from "./dateien.mjs";
import * as schnitt from "./schnitt.mjs";
import * as byok from "./byok.mjs";
import * as addons from "./addons.mjs";
import * as lokal from "./lokal.mjs";
import * as programme from "./programme.mjs";

const STARTER = path.join(PLUGIN_ROOT, "local", "oberflaeche.mjs");

/** Startet die Installation eines Addons im Hintergrund. Sie kann viele Minuten dauern; den Stand zeigt addons_liste. */
function addonInstallieren({ name, lizenz_bestaetigt }) {
  const a = addons.ADDONS[name];
  if (lizenz_bestaetigt !== true) {
    return {
      gestartet: false, lizenzhinweise: a.lizenzhinweise, quelle: a.quelle, lizenz: a.lizenz, groesse: a.groesse,
      hinweis: "Noch nichts installiert. Zeig dem Nutzer zuerst diese Lizenzhinweise und die Größe. Erst nach seinem ausdrücklichen Ja noch einmal mit lizenz_bestaetigt: true aufrufen."
    };
  }
  if (addons.standLesen(name)?.stand === "laeuft") {
    return { gestartet: false, hinweis: "Die Installation läuft schon. addons_liste zeigt den Stand." };
  }
  const kind = spawn(process.execPath, [path.join(PLUGIN_ROOT, "local", "addon.mjs"), name, "--ja"],
    { detached: true, stdio: "ignore", windowsHide: true, env: process.env });
  kind.unref();
  return { gestartet: true, hinweis: `Die Installation von ${a.titel} läuft im Hintergrund (${a.groesse}). addons_liste zeigt den Stand; frühestens nach einer Minute nachsehen.` };
}

function oberflaecheOeffnen() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [STARTER], { timeout: 30000, windowsHide: true, env: process.env }, (err, stdout) => {
      let r = null;
      try { r = JSON.parse(String(stdout).trim().split("\n").pop()); } catch { /* unten */ }
      if (err || !r?.ok) reject(new Fehler(r?.fehler || "Die Oberfläche konnte nicht gestartet werden."));
      else resolve({ geoeffnet: true, adresse: r.adresse, hinweis: "Das Studio ist im Browser geöffnet." });
    });
  });
}

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
      plattform: process.platform,
      programm_ordner: programme.programmOrdner()
    })
  },
  {
    name: "studio_einrichten",
    description: "Legt den Studio-Ordner an bzw. aktualisiert ihn (Anleitung, Dashboard). Eigene Regeln und Dashboard-Daten des Nutzers bleiben erhalten.",
    inputSchema: obj({}),
    run: async () => studio.einrichten()
  },
  {
    name: "oberflaeche_oeffnen",
    description: "Öffnet die Oberfläche des Studios im Browser (Projekte, Galerie, Guthaben, Aufträge). Startet sie im Hintergrund, falls sie noch nicht läuft.",
    inputSchema: obj({}),
    run: async () => oberflaecheOeffnen()
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
    name: "lokal_status",
    description: "Zeigt, welche lokalen Modelle auf diesem Rechner bereitstehen (Ollama, LM Studio, llama.cpp), ob die Programme installiert sind und laufen. Für den Start des Studios ohne Claude-Abo.",
    inputSchema: obj({}),
    run: async () => {
      const status = await lokal.erkennen();
      return {
        anbieter: await Promise.all(status.map(async (x) => ({
          anbieter: x.anbieter, titel: lokal.ANBIETER[x.anbieter].titel, seite: lokal.ANBIETER[x.anbieter].seite,
          installiert: x.laeuft || Boolean(await lokal.startProgramm(x.anbieter)), laeuft: x.laeuft, modelle: x.modelle.map((m) => m.name)
        }))),
        hinweis: "Gelistet sind nur Modelle, die Werkzeuge aufrufen können. Bilder, Videos und Musik kommen weiter von AIQORA und kosten Guthaben."
      };
    }
  },
  {
    name: "lokal_knopf_anlegen",
    description: "Legt auf dem Desktop den Knopf „AIQORA Studio (lokal)“ an. Er startet das Studio mit einem lokalen Modell statt mit Claude. Überschreibt keine fremde Datei.",
    inputSchema: obj({}),
    run: async () => programme.lokalKnopfAnlegen()
  },
  {
    name: "programm_einrichten",
    description: "Richtet das Studio in einem weiteren Programm ein: OpenAI Codex oder Google Antigravity. Trägt dort die Verbindungen zu AIQORA ein und installiert die Befehle des Studios als Skills. Eigene, gleichnamige Einträge des Nutzers bleiben stehen (Feld 'behalten'), außer mit ersetzen. Schreibt nie einen Schlüssel in eine Datei.",
    inputSchema: obj({
      programm: { type: "string", enum: ["codex", "antigravity"], description: "codex oder antigravity" },
      ersetzen: { type: "boolean", description: "Auch eigene, gleichnamige Einträge des Nutzers ersetzen (vorher wird gesichert). Nur nach ausdrücklichem Ja des Nutzers." }
    }, ["programm"]),
    run: async ({ programm, ersetzen }) => {
      const angaben = { ersetzen: ersetzen === true, zusatz: await addons.verbindungen() };
      return {
        ...(programm === "codex" ? programme.codexEinrichten(angaben) : programme.antigravityEinrichten(angaben)),
        knopf: programme.studioKnopfAnlegen()
      };
    }
  },
  {
    name: "addons_liste",
    description: "Zeigt die Addons des Studios (Zusatzprogramme für Grafik und Ton, die nicht zum Studio gehören): wofür, Größe, Lizenz, Lizenzhinweise, ob installiert und den Stand einer laufenden Installation.",
    inputSchema: obj({}),
    run: async () => addons.liste()
  },
  {
    name: "addon_installieren",
    description: "Installiert ein Addon von seiner Originalquelle. Ohne lizenz_bestaetigt liefert es nur die Lizenzhinweise. Erst nach dem ausdrücklichen Ja des Nutzers zu diesen Hinweisen mit lizenz_bestaetigt: true aufrufen. Läuft im Hintergrund.",
    inputSchema: obj({
      name: { type: "string", enum: Object.keys(addons.ADDONS), description: "Name aus addons_liste" },
      lizenz_bestaetigt: { type: "boolean", description: "true nur, wenn der Nutzer die Lizenzhinweise gesehen und ausdrücklich zugestimmt hat" }
    }, ["name"]),
    run: async (a) => addonInstallieren(a)
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
