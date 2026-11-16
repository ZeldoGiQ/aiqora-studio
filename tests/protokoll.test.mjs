import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { starteHelfer, tempStudio } from "./hilfen.mjs";

const GEHEIM = "sk-test-NIEMALS-ZEIGEN-1234567890";

test("MCP-Handshake, Werkzeugliste und unbekannte Methoden", async () => {
  const h = starteHelfer({ AIQORA_STUDIO_ORDNER: tempStudio() });
  try {
    const init = await h.anfrage("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    assert.equal(init.result.protocolVersion, "2025-06-18");
    assert.equal(init.result.serverInfo.name, "aiqora-local");
    h.notiz("notifications/initialized");
    const unbekannteVersion = await h.anfrage("initialize", { protocolVersion: "1999-01-01" });
    assert.equal(unbekannteVersion.result.protocolVersion, "2025-06-18");

    const liste = await h.anfrage("tools/list", {});
    const namen = liste.result.tools.map((t) => t.name);
    for (const n of ["studio_info", "studio_einrichten", "projekt_anlegen", "datei_herunterladen", "datei_hochladen",
      "datei_oeffnen", "schnitt_kuerzen", "schnitt_zusammenfuegen", "schnitt_hochkant", "schnitt_lautheit",
      "dashboard_aktualisieren", "byok_status", "byok_bild", "oberflaeche_oeffnen"]) {
      assert.ok(namen.includes(n), `Werkzeug fehlt: ${n}`);
    }
    for (const t of liste.result.tools) assert.equal(t.inputSchema.type, "object");

    const ping = await h.anfrage("ping", {});
    assert.deepEqual(ping.result, {});
    const falsch = await h.anfrage("gibt/es/nicht", {});
    assert.equal(falsch.error.code, -32601);
    const unbekannt = await h.aufruf("gibt_es_nicht");
    assert.ok(unbekannt.fehler);
  } finally { await h.beenden(); }
});

test("Studio einrichten, Projekt anlegen, Dashboard", async () => {
  const studio = tempStudio();
  const h = starteHelfer({ AIQORA_STUDIO_ORDNER: studio });
  try {
    const vorher = await h.aufruf("projekt_anlegen", { name: "Test" });
    assert.ok(vorher.fehler, "Projekt ohne eingerichtetes Studio muss scheitern");

    const e = await h.aufruf("studio_einrichten");
    assert.ok(!e.fehler, e.text);
    for (const f of ["CLAUDE.md", "AGENTS.md", "regeln.md", "dashboard.html", "daten.js"]) {
      assert.ok(existsSync(path.join(studio, f)), `${f} fehlt`);
    }
    assert.ok(!readFileSync(path.join(studio, "AGENTS.md"), "utf8").includes("{{"), "Platzhalter in AGENTS.md nicht ersetzt");

    writeFileSync(path.join(studio, "regeln.md"), "# Meine Regeln\n- immer breit\n");
    writeFileSync(path.join(studio, "CLAUDE.md"), "# Meine eigene Anleitung\n");
    const zweites = await h.aufruf("studio_einrichten");
    assert.match(readFileSync(path.join(studio, "regeln.md"), "utf8"), /immer breit/, "regeln.md darf nicht überschrieben werden");
    assert.equal(readFileSync(path.join(studio, "CLAUDE.md"), "utf8"), "# Meine eigene Anleitung\n", "eigene CLAUDE.md darf nicht überschrieben werden");
    assert.deepEqual(zweites.daten.uebersprungen, ["CLAUDE.md"]);

    const info = await h.aufruf("studio_info");
    assert.equal(info.daten.eingerichtet, true);
    assert.equal(path.resolve(info.daten.studio_ordner), path.resolve(studio));

    const p = await h.aufruf("projekt_anlegen", { name: "Weihnachts-Musikvideo für Müller" });
    assert.ok(!p.fehler, p.text);
    assert.match(p.daten.projekt, /^\d{4}-\d{2}-\d{2}-weihnachts-musikvideo-fuer-mueller$/);
    for (const u of ["bilder", "clips", "audio", "fertig", "notizen.md"]) assert.ok(existsSync(path.join(p.daten.ordner, u)));

    const liste = await h.aufruf("projekte_liste");
    assert.equal(liste.daten.projekte.length, 1);

    const d = await h.aufruf("dashboard_aktualisieren", {
      credits: 1234.5, tipp: "Hallo </script><script>alert(1)</script>",
      jobs: [{ name: "Song", status: "ok", credits: 4, datei: "projekte/x/song.mp3" }]
    });
    assert.ok(!d.fehler, d.text);
    const daten = readFileSync(path.join(studio, "daten.js"), "utf8");
    assert.ok(daten.startsWith("window.AIQORA_DATA = "));
    const geparst = JSON.parse(daten.slice(daten.indexOf("{"), daten.lastIndexOf("}") + 1));
    assert.equal(geparst.credits, 1234.5);
    assert.equal(geparst.jobs[0].name, "Song");

    const typFalsch = await h.aufruf("dashboard_aktualisieren", { credits: "viel" });
    assert.ok(typFalsch.fehler);
    const unbekanntesFeld = await h.aufruf("projekt_anlegen", { name: "x", boese: 1 });
    assert.ok(unbekanntesFeld.fehler);
  } finally { await h.beenden(); }
});

test("Sicherheit: Pfade, Netzwerk, Schlüssel", async () => {
  const studio = tempStudio();
  const h = starteHelfer({ AIQORA_STUDIO_ORDNER: studio, AIQORA_BYOK_FAL: GEHEIM, AIQORA_BYOK_WAVESPEED: "${user_config.byok_wavespeed_key}" });
  try {
    await h.aufruf("studio_einrichten");

    const raus = await h.aufruf("datei_oeffnen", { pfad: "../../../Windows/win.ini" });
    assert.ok(raus.fehler);
    assert.match(raus.text, /außerhalb/);
    const absolutRaus = await h.aufruf("datei_oeffnen", { pfad: path.resolve(studio, "..", "..", "irgendwas.txt") });
    assert.ok(absolutRaus.fehler);

    const http = await h.aufruf("datei_herunterladen", { url: "http://example.com/a.png" });
    assert.ok(http.fehler);
    assert.match(http.text, /https/);

    const fremd = await h.aufruf("datei_hochladen", { pfad: path.join(studio, "regeln.md"), upload_url: "https://example.com/upload" });
    assert.ok(fremd.fehler);
    assert.match(fremd.text, /nur zu AIQORA/);
    const trick = await h.aufruf("datei_hochladen", { pfad: path.join(studio, "regeln.md"), upload_url: "https://evil-supabase.co.example.com/x" });
    assert.ok(trick.fehler);

    const ausgabeAusserhalb = await h.aufruf("schnitt_kuerzen", { eingabe: "regeln.md", start: 0, ende: 1, ausgabe: "../raus.mp4" });
    assert.ok(ausgabeAusserhalb.fehler);

    const st = await h.aufruf("byok_status");
    assert.ok(!st.fehler);
    const fal = st.daten.anbieter.find((a) => a.id === "fal");
    const ws = st.daten.anbieter.find((a) => a.id === "wavespeed");
    assert.equal(fal.eingetragen, true);
    assert.equal(ws.eingetragen, false, "Nicht ersetzter Platzhalter zählt nicht als Schlüssel");

    const bild = await h.aufruf("byok_bild", { prompt: "Ein Hund" });
    assert.ok(bild.fehler, "BYOK ohne Abo-Nachweis muss scheitern");

    assert.ok(!h.alleAusgaben().includes(GEHEIM), "Schlüssel darf nie in einer Antwort stehen");
    assert.ok(!h.stderr().includes(GEHEIM), "Schlüssel darf nie im Protokoll stehen");
  } finally { await h.beenden(); }
});
