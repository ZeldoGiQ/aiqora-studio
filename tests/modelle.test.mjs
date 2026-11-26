// Der Modellkatalog (Preise und Fähigkeiten von AIQORA) und das Festhalten von Modell und Kosten je Datei.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { starteHelfer } from "./hilfen.mjs";

const basis = mkdtempSync(path.join(os.tmpdir(), "aiqora-modelle-"));
process.env.AIQORA_APP_DATEN = path.join(basis, "app");
const modelle = await import("../local/lib/modelle.mjs");
const erzeugt = await import("../local/lib/erzeugt.mjs");

// So antwortet aiqora_list_models (gekürzt).
const ANTWORT = {
  domains: {
    video: [
      {
        id: "seedance-2.5", displayName: "Seedance 2.5", aliases: ["seedance"], credits: 21.6, creditsUnit: "per 4s clip (base resolution)",
        durations: [4, 5], resolutions: ["720p", "480p", "1080p"], aspectRatios: ["16:9", "9:16"],
        supportsSound: true, supportsImageInput: true, supportsAudioReference: true, supportsEndFrame: true, supportsLipsync: true, supportsDraft: true,
        maxReferenceImages: 10, creditsByDuration: { 4: 21.6, 5: 27 }, resolutionMultipliers: { "480p": 0.5, "720p": 1, "1080p": 2.222222 }
      },
      {
        id: "kling-3.0", displayName: "Kling 3.0 Standard", aliases: [], credits: 7, creditsUnit: "per 5s clip (base resolution)",
        durations: [5, 10], resolutions: ["1080p"], aspectRatios: ["16:9"], supportsSound: true, supportsImageInput: true,
        supportsAudioReference: false, supportsEndFrame: false, supportsLipsync: false, creditsByDuration: { 5: 7, 10: 14 }, soundCreditsExtra: { 5: 6, 10: 12 }
      },
      { id: "cosmos", displayName: "Cosmos 3", aliases: [], credits: 1.2, creditsUnit: "per 1s clip (base resolution)", durations: [1, 2], resolutions: ["720p"], aspectRatios: ["16:9"], creditsByDuration: { 1: 1.2, 2: 2.4 } },
      { displayName: "ohne Kennung" }
    ],
    image: [
      { id: "nano-banana-2", displayName: "Nano Banana 2", aliases: [], credits: 1.5, creditsUnit: "per image (1K)", resolutions: ["1K", "2K", "4K"], aspectRatios: ["1:1"], supportsImageInput: true, resolutionCredits: { "1K": 1.5, "2K": 1.7, "4K": 2.4 } },
      { id: "z-image", displayName: "Z-Image Turbo", aliases: [], credits: 0.1, creditsUnit: "per image (1K)", resolutions: ["1K"], aspectRatios: ["1:1"], supportsImageInput: false }
    ],
    music: [{ id: "suno-v5-5", displayName: "Suno V5.5", aliases: [], credits: 1.2, creditsUnit: "per generation" }],
    tts: [{ id: "eleven", displayName: "ElevenLabs Turbo", aliases: [], credits: 0.5, creditsUnit: "per minute of speech" }],
    unbekannt: [{ id: "x", displayName: "X" }]
  },
  lipsyncModels: [
    { id: "minimax-h3", displayName: "MiniMax H3", tool: "aiqora_lipsync_video", supportsLipsync: true, default: true, audio: { exactSeconds: 5 }, maxReferenceImages: 5, credits: "9 per 5 s scene" },
    { id: "wan-2.2-s2v", displayName: "Wan 2.2", supportsLipsync: true, default: false, audio: { maxSeconds: 120 }, maxReferenceImages: 1, credits: "0.6 per second of audio (720p)" }
  ]
};

function fakeAiqora() {
  const f = { aufrufe: 0, kaputt: false, antwort: ANTWORT };
  f.aufrufen = async (name) => {
    assert.equal(name, "aiqora_list_models");
    f.aufrufe++;
    if (f.kaputt) throw new Error("kein Netz");
    return f.antwort;
  };
  return f;
}

test("Preise für Clips rechnen wie AIQORA (mit Preisabfragen bei AIQORA nachgeprüft)", () => {
  assert.equal(modelle.clipPreis(2.5, 1), 2.5, "Faktor 1: der Preis gilt genau");
  assert.equal(modelle.clipPreis(12.75, 1), 12.75);
  assert.equal(modelle.clipPreis(9, 2.222222), 20, "sonst auf ganze Credits aufrunden");
  assert.equal(modelle.clipPreis(6, 1.33), 8);
  assert.equal(modelle.clipPreis(21.6, 0.5), 11);
  assert.equal(modelle.clipPreis(14.4, 0.5), 8);
});

test("Einheiten in einfachem Deutsch", () => {
  assert.equal(modelle.einheit("per 6s clip (base resolution)"), "pro Clip mit 6 Sekunden");
  assert.equal(modelle.einheit("per 1s clip (base resolution)"), "pro Clip mit 1 Sekunde");
  assert.equal(modelle.einheit("per image (1K)"), "pro Bild (1K)");
  assert.equal(modelle.einheit("per generation"), "pro Erzeugung");
  assert.equal(modelle.einheit("per minute of speech"), "pro Minute Sprache");
  assert.equal(modelle.einheit("per second of audio (720p)"), "pro Sekunde Ton (720p)");
  assert.equal(modelle.einheit("per neue Sache"), "pro neue Sache", "Unbekanntes bleibt lesbar");
});

test("Katalog aus der Antwort von AIQORA: Arten, Fähigkeiten, Preistabellen, günstigstes zuerst", () => {
  const arten = modelle.normalisieren(ANTWORT);
  assert.deepEqual(Object.fromEntries(Object.entries(arten).map(([a, l]) => [a, l.map((m) => m.id)])), {
    video: ["cosmos", "kling-3.0", "seedance-2.5"], bild: ["z-image", "nano-banana-2"], musik: ["suno-v5-5"], stimme: ["eleven"], lipsync: ["wan-2.2-s2v", "minimax-h3"]
  });
  const s = arten.video[2];
  assert.deepEqual(s.kann, ["Ton", "Bild als Vorlage", "Start- und Endbild", "Ton als Vorlage", "Lippensynchron", "Entwurf", "bis 10 Vorlagenbilder"]);
  assert.deepEqual(s.preise.nachDauer, [
    { dauer: 4, preise: { "480p": 11, "720p": 21.6, "1080p": 48 }, tonAufschlag: null },
    { dauer: 5, preise: { "480p": 14, "720p": 27, "1080p": 60 }, tonAufschlag: null }
  ]);
  assert.deepEqual([s.preisVon, s.preisBis, s.einheit], [11, 60, "pro Clip mit 4 Sekunden"]);
  const k = arten.video[1];
  assert.deepEqual([k.preisVon, k.preisBis], [7, 26], "teuerster Fall: 10 Sekunden mit Ton");
  assert.deepEqual(arten.bild[1].preise, { nachAufloesung: { "1K": 1.5, "2K": 1.7, "4K": 2.4 } });
  assert.equal(arten.bild[0].preise, null);
  const h3 = arten.lipsync[1];
  assert.deepEqual([h3.credits, h3.einheit, h3.standard], [9, "pro Szene mit 5 Sekunden", true]);
  assert.ok(h3.kann.includes("Ton genau 5 Sekunden"));
  assert.deepEqual([arten.lipsync[0].credits, arten.lipsync[0].einheit], [0.6, "pro Sekunde Ton (720p)"]);
  assert.deepEqual(modelle.normalisieren(null), { video: [], bild: [], musik: [], stimme: [], lipsync: [] });
});

test("Katalog laden: zehn Minuten gültig, neu laden auf Wunsch, ohne Netz der letzte Stand", async () => {
  const f = fakeAiqora();
  f.kaputt = true;
  await assert.rejects(modelle.katalog(f), /kein Netz/, "ohne Netz und ohne gespeicherten Stand gibt es einen Fehler");
  f.kaputt = false;

  const erster = await modelle.katalog(f);
  assert.equal(erster.veraltet, false);
  assert.equal(erster.arten.video.length, 3);
  await modelle.katalog(f);
  assert.equal(f.aufrufe, 2, "zweiter Aufruf kommt aus dem Speicher");

  f.antwort = { domains: { image: [{ id: "neu", displayName: "Neu", credits: 9, creditsUnit: "per image" }] }, lipsyncModels: [] };
  const frisch = await modelle.katalog(f, { frisch: true });
  assert.deepEqual(frisch.arten.bild.map((m) => [m.id, m.preisVon]), [["neu", 9]], "neue Preise von AIQORA kommen an");

  modelle.vergessen(); // wie nach einem Neustart: nur noch die Datei auf der Platte
  f.kaputt = true;
  const alt = await modelle.katalog(f, { frisch: true });
  assert.equal(alt.veraltet, true);
  assert.equal(alt.arten.bild[0].id, "neu");

  f.kaputt = false;
  f.antwort = { domains: {}, lipsyncModels: [] };
  assert.equal((await modelle.katalog(f, { frisch: true })).veraltet, true, "eine leere Antwort ersetzt den guten Stand nicht");
  f.antwort = ANTWORT;
  await modelle.katalog(f, { frisch: true });
});

test("Finden, filtern und kurz fassen für die Assistenten", async () => {
  const kat = await modelle.katalog(fakeAiqora());
  assert.equal(modelle.finden("SEEDANCE", kat).id, "seedance-2.5", "über Alias");
  assert.equal(modelle.finden("kling 3.0 standard", kat).id, "kling-3.0", "über den Namen");
  assert.equal(modelle.finden("gibt-es-nicht", kat), null);
  assert.deepEqual(modelle.filtern(kat, { art: "video", suche: "endbild" }).map((m) => m.id), ["seedance-2.5"]);
  assert.equal(modelle.filtern(kat, {}).length, 9);
  assert.throws(() => modelle.filtern(kat, { art: "hologramm" }), /gibt es nicht/);
  assert.equal(modelle.kurz(modelle.finden("kling-3.0", kat)),
    "Kling 3.0 Standard (kling-3.0): ab 7 Credits pro Clip mit 5 Sekunden; bis 26 Credits; Dauer 5 s, 10 s; 1080p; kann: Ton, Bild als Vorlage");
  assert.equal(modelle.kurz(modelle.finden("z-image", kat)), "Z-Image Turbo (z-image): 0,1 Credits pro Bild (1K); 1K");
});

test("Modell und Kosten je Datei: festhalten, lesen, Summe", () => {
  const projekt = path.join(basis, "projekt");
  for (const u of ["bilder", "clips"]) mkdirSync(path.join(projekt, u), { recursive: true });
  const datei = (rel) => { const p = path.join(projekt, rel); writeFileSync(p, "x"); return p; };

  assert.equal(erzeugt.merken(projekt, datei("bilder/ohne.png"), {}), null, "ohne Angaben wird nichts festgehalten");
  assert.ok(!existsSync(path.join(projekt, erzeugt.DATEI)));

  const e = erzeugt.merken(projekt, datei("bilder/katze.png"), { modell: "nano-banana-2", credits: 1.5, auftrag: "t1" });
  assert.deepEqual([e.modell, e.modell_name, e.credits, e.auftrag], ["nano-banana-2", "Nano Banana 2", 1.5, "t1"]);
  erzeugt.merken(projekt, datei("bilder/katze-2.png"), { modell: "nano-banana-2", credits: 1.5, auftrag: "t1" });
  erzeugt.merken(projekt, datei("clips/clip.mp4"), { modell: "Unbekanntes Modell\u0000\n", credits: 13 });
  erzeugt.merken(projekt, datei("clips/falsch.mp4"), { credits: -5, modell: "x" });

  const alle = erzeugt.lesen(projekt);
  assert.deepEqual(Object.keys(alle).sort(), ["bilder/katze-2.png", "bilder/katze.png", "clips/clip.mp4", "clips/falsch.mp4"]);
  assert.equal(alle["clips/clip.mp4"].modell_name, "Unbekanntes Modell");
  assert.equal(alle["clips/falsch.mp4"].credits, undefined, "unsinnige Kosten werden nicht übernommen");
  assert.equal(erzeugt.summe(alle), 14.5, "zwei Dateien desselben Auftrags zählen einmal");

  unlinkSync(path.join(projekt, "clips", "clip.mp4"));
  erzeugt.merken(projekt, datei("clips/neu.mp4"), { credits: 2 });
  assert.equal(erzeugt.lesen(projekt)["clips/clip.mp4"], undefined, "Einträge zu gelöschten Dateien verschwinden");

  writeFileSync(path.join(projekt, erzeugt.DATEI), "{ kaputt");
  assert.deepEqual(erzeugt.lesen(projekt), {}, "eine kaputte Datei bricht nichts");
  assert.match(readFileSync(path.join(projekt, erzeugt.DATEI), "utf8"), /kaputt/);
});

test("Werkzeug modelle_liste: Übersicht und Liste, auch ohne Netz aus dem letzten Stand", async () => {
  // Der Helfer läuft als eigenes Programm ohne erreichbares AIQORA: Er nimmt den oben gespeicherten Stand.
  const h = starteHelfer({
    AIQORA_APP_DATEN: process.env.AIQORA_APP_DATEN, AIQORA_STUDIO_ORDNER: path.join(basis, "Studio"),
    AIQORA_MCP_URL: "http://127.0.0.1:9/mcp", AIQORA_API_KEY: "aiq_test_" + "m".repeat(30), AIQORA_SCHLUESSEL_ART: "datei", AIQORA_KEIN_REGISTRY: "1"
  });
  try {
    const u = await h.aufruf("modelle_liste", { aktualisieren: true });
    assert.ok(!u.fehler, u.text);
    assert.match(u.daten.veraltet, /nicht erreichbar/);
    assert.deepEqual(u.daten.arten.map((a) => [a.art, a.anzahl]), [["video", 3], ["bild", 2], ["musik", 1], ["stimme", 1], ["lipsync", 2]]);
    assert.match(u.daten.arten[0].guenstigstes, /^Cosmos 3 \(cosmos\): ab 1,2 Credits/);

    const v = await h.aufruf("modelle_liste", { art: "video", suche: "ton" });
    assert.equal(v.daten.anzahl, 2);
    assert.ok(v.daten.modelle.every((z) => typeof z === "string"), "eine Zeile je Modell");
    const d = await h.aufruf("modelle_liste", { art: "bild", details: true });
    assert.equal(d.daten.modelle[1].preise.nachAufloesung["4K"], 2.4);
    const falsch = await h.aufruf("modelle_liste", { art: "hologramm" });
    assert.ok(falsch.fehler);
  } finally { await h.beenden(); }
});
