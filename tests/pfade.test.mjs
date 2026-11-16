import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { dateiname, kurzname, liegtIn } from "../local/lib/pfade.mjs";
import { pruefeEingaben } from "../local/lib/werkzeuge.mjs";

test("kurzname macht sichere Namen", () => {
  assert.equal(kurzname("Weihnachts-Musikvideo für Müller!"), "weihnachts-musikvideo-fuer-mueller");
  assert.equal(kurzname("Café Größe"), "cafe-groesse");
  assert.equal(kurzname("../../etc/passwd"), "etc-passwd");
  assert.equal(kurzname(""), "projekt");
  assert.ok(kurzname("x".repeat(100)).length <= 40);
});

test("dateiname behält die Endung und entfernt Gefährliches", () => {
  assert.equal(dateiname("Mein Song (final).MP3"), "mein-song-final.mp3");
  assert.equal(dateiname("../../böse.png?token=abc"), "boese.png");
  assert.equal(dateiname("ohne-endung"), "ohne-endung");
});

test("liegtIn erkennt Pfade außerhalb", () => {
  const basis = path.resolve("/studio");
  assert.equal(liegtIn(basis, path.join(basis, "a", "b.mp4")), true);
  assert.equal(liegtIn(basis, basis), true);
  assert.equal(liegtIn(basis, path.resolve(basis, "..", "anders")), false);
  assert.equal(liegtIn(basis, path.resolve("/studio-zwei/x")), false);
});

test("pruefeEingaben prüft Pflichtfelder, Typen und unbekannte Felder", () => {
  const schema = { type: "object", properties: { a: { type: "string" }, b: { type: ["number", "null"] }, c: { type: "array", items: { type: "string" } } }, required: ["a"] };
  assert.deepEqual(pruefeEingaben(schema, { a: "x", b: null, c: ["y"] }), { a: "x", b: null, c: ["y"] });
  assert.throws(() => pruefeEingaben(schema, {}), /fehlt/);
  assert.throws(() => pruefeEingaben(schema, { a: 1 }), /Typ/);
  assert.throws(() => pruefeEingaben(schema, { a: "x", z: 1 }), /Unbekannte/);
  assert.throws(() => pruefeEingaben(schema, { a: "x", c: [1] }), /falschem Typ/);
});
