import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { starteHelfer, tempStudio } from "./hilfen.mjs";

function hatFfmpeg() {
  try { execFileSync("ffmpeg", ["-hide_banner", "-version"], { stdio: "ignore" }); return true; } catch { return false; }
}

const ohneFfmpeg = !hatFfmpeg();

function testClip(ziel, sekunden, mitTon = true) {
  const args = ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `testsrc2=size=640x360:rate=24:duration=${sekunden}`];
  if (mitTon) args.push("-f", "lavfi", "-i", `sine=frequency=440:duration=${sekunden}`);
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
  if (mitTon) args.push("-c:a", "aac", "-shortest");
  args.push(ziel);
  execFileSync("ffmpeg", args);
}

test("Schnitt-Werkzeuge mit ffmpeg", { skip: ohneFfmpeg && "ffmpeg ist nicht installiert" }, async () => {
  const studio = tempStudio();
  const h = starteHelfer({ AIQORA_STUDIO_ORDNER: studio });
  try {
    await h.aufruf("studio_einrichten");
    const ordner = path.join(studio, "projekte", "test");
    mkdirSync(ordner, { recursive: true });
    const a = path.join(ordner, "a.mp4"), b = path.join(ordner, "b.mp4"), ton = path.join(ordner, "ton.mp3");
    testClip(a, 3); testClip(b, 2, false);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=330:duration=6", ton]);

    const info = await h.aufruf("datei_info", { pfad: a });
    assert.ok(!info.fehler, info.text);
    assert.equal(info.daten.video.breite, 640);
    assert.ok(Math.abs(info.daten.dauer_s - 3) < 0.2);

    const k = await h.aufruf("schnitt_kuerzen", { eingabe: a, start: 0.5, ende: 2 });
    assert.ok(!k.fehler, k.text);
    const ki = await h.aufruf("datei_info", { pfad: k.daten.ausgabe });
    assert.ok(Math.abs(ki.daten.dauer_s - 1.5) < 0.2, `Dauer ${ki.daten.dauer_s}`);

    const falsch = await h.aufruf("schnitt_kuerzen", { eingabe: a, start: 2, ende: 1 });
    assert.ok(falsch.fehler);

    const hk = await h.aufruf("schnitt_hochkant", { eingabe: a });
    assert.ok(!hk.fehler, hk.text);
    const hki = await h.aufruf("datei_info", { pfad: hk.daten.ausgabe });
    assert.equal(hki.daten.video.breite, 1080);
    assert.equal(hki.daten.video.hoehe, 1920);

    const z = await h.aufruf("schnitt_zusammenfuegen", { eingaben: [a, b], tonspur: ton });
    assert.ok(!z.fehler, z.text);
    const zi = await h.aufruf("datei_info", { pfad: z.daten.ausgabe });
    assert.ok(Math.abs(zi.daten.dauer_s - 5) < 0.3, `Dauer ${zi.daten.dauer_s}`);
    assert.ok(zi.daten.audio, "Tonspur fehlt");

    const l = await h.aufruf("schnitt_lautheit", { eingabe: ton });
    assert.ok(!l.fehler, l.text);
  } finally { await h.beenden(); }
});
