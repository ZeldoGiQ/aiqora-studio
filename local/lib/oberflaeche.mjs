// Die lokale Oberfläche: ein kleiner Webserver nur für diesen Rechner (127.0.0.1).
// Er zeigt Projekte, Dateien, Guthaben und Aufträge und spricht dafür mit AIQORA.
// Sicherheit: nur 127.0.0.1, Prüfung von Host und Origin, Sitzungs-Cookie aus einem Zufalls-Kennwort pro Start,
// Dateien nur aus dem Studio-Ordner, der AIQORA-Schlüssel erreicht nie den Browser.
import http from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Fehler, liegtIn, studioOrdner } from "./pfade.mjs";
import { version } from "./studio.mjs";
import { oeffnen, typVonEndung } from "./dateien.mjs";
import * as schluessel from "./schluessel.mjs";
import { SchluesselFehler } from "./aiqora.mjs";

export const WEB_ORDNER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web");

const STATISCH = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/aiqora-logo.webp": ["aiqora-logo.webp", "image/webp"],
  "/favicon.png": ["favicon.png", "image/png"]
};
// Logo und Icon dürfen auch ohne Sitzung geladen werden (Seite „bitte über den Desktop-Knopf öffnen“).
const OEFFENTLICH = new Set(["/aiqora-logo.webp", "/favicon.png"]);

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data: blob:",
  "media-src 'self'", "connect-src 'self'", "font-src 'self'", "object-src 'none'",
  "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
].join("; ");

const GRUND_HEADER = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
};

const MEDIEN = { image: "bild", video: "video", audio: "audio" };
const VERSTECKT = new Set(["node_modules", ".git", "__pycache__"]);
const MAX_DATEIEN = 600;
const MAX_TIEFE = 3;

function gleich(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function cookieLesen(req, name) {
  for (const teil of String(req.headers.cookie || "").split(";")) {
    const [k, ...v] = teil.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

function senden(res, status, koerper, header = {}) {
  res.writeHead(status, { ...GRUND_HEADER, ...header });
  res.end(koerper);
}

function json(res, status, daten) {
  senden(res, status, JSON.stringify(daten), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
}

const SEITE_OHNE_SITZUNG = `<!doctype html><html lang="de"><meta charset="utf-8"><title>AIQORA Studio</title>
<link rel="icon" href="/favicon.png" type="image/png">
<body style="font-family:system-ui;background:#0d0a14;color:#eee;display:grid;place-items:center;height:100vh;margin:0">
<div style="max-width:420px;text-align:center"><img src="/aiqora-logo.webp" alt="AIQORA" width="260"><h1>Studio</h1>
<p>Bitte öffne das Studio über den Knopf „AIQORA Studio“ auf deinem Desktop.</p></div></body></html>`;

function koerperLesen(req, max = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let groesse = 0;
    const teile = [];
    req.on("data", (d) => {
      groesse += d.length;
      if (groesse > max) { reject(new Fehler("Anfrage zu groß.")); req.destroy(); return; }
      teile.push(d);
    });
    req.on("end", () => {
      try { resolve(teile.length ? JSON.parse(Buffer.concat(teile).toString("utf8")) : {}); }
      catch { reject(new Fehler("Ungültige Anfrage.")); }
    });
    req.on("error", reject);
  });
}

// ---------- Projekte ----------

function projekteOrdner() {
  return path.join(studioOrdner(), "projekte");
}

/** Projektordner zu einem Namen, nur direkt unter projekte/. */
export function projektOrdner(name) {
  if (typeof name !== "string" || !name || name !== path.basename(name) || name.startsWith(".")) {
    throw new Fehler("Unbekanntes Projekt.");
  }
  const ordner = path.join(projekteOrdner(), name);
  if (!liegtIn(projekteOrdner(), ordner) || !existsSync(ordner) || !statSync(ordner).isDirectory()) {
    throw new Fehler("Unbekanntes Projekt.");
  }
  return ordner;
}

function artVon(datei) {
  const typ = typVonEndung(datei);
  return MEDIEN[typ.split("/")[0]] || "andere";
}

/** Alle Dateien eines Projekts (bis Tiefe 3), neueste zuerst. */
export function projektDateien(ordner) {
  const liste = [];
  const laufen = (dir, tiefe) => {
    if (tiefe > MAX_TIEFE || liste.length >= MAX_DATEIEN) return;
    let eintraege;
    try { eintraege = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of eintraege) {
      if (e.name.startsWith(".") || VERSTECKT.has(e.name)) continue;
      const voll = path.join(dir, e.name);
      if (e.isDirectory()) { laufen(voll, tiefe + 1); continue; }
      if (!e.isFile()) continue;
      const st = statSync(voll);
      const rel = path.relative(ordner, voll).split(path.sep).join("/");
      liste.push({
        pfad: rel,
        name: e.name,
        ordner: rel.includes("/") ? rel.split("/")[0] : "",
        art: artVon(e.name),
        groesse: st.size,
        geaendert: st.mtime.toISOString()
      });
      if (liste.length >= MAX_DATEIEN) return;
    }
  };
  laufen(ordner, 0);
  return liste.sort((a, b) => b.geaendert.localeCompare(a.geaendert));
}

function titelBild(dateien) {
  const bevorzugt = (art, ordner) => dateien.find((d) => d.art === art && (!ordner || d.ordner === ordner));
  return bevorzugt("bild", "fertig") || bevorzugt("video", "fertig") || bevorzugt("bild") || bevorzugt("video") || null;
}

export function projekteListe() {
  const basis = projekteOrdner();
  if (!existsSync(basis)) return [];
  return readdirSync(basis, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => {
      const ordner = path.join(basis, e.name);
      const dateien = projektDateien(ordner);
      const zaehlen = (art) => dateien.filter((d) => d.art === art).length;
      const titel = titelBild(dateien);
      const datum = /^\d{4}-\d{2}-\d{2}/.exec(e.name)?.[0] || "";
      return {
        name: e.name,
        titel: (datum ? e.name.slice(datum.length + 1) : e.name).replace(/-/g, " ") || e.name,
        datum,
        bilder: zaehlen("bild"), videos: zaehlen("video"), audios: zaehlen("audio"),
        fertig: dateien.filter((d) => d.ordner === "fertig" && d.art !== "andere").length,
        titelbild: titel ? { pfad: titel.pfad, art: titel.art } : null,
        geaendert: dateien[0]?.geaendert || statSync(ordner).mtime.toISOString()
      };
    })
    .sort((a, b) => b.geaendert.localeCompare(a.geaendert));
}

function notizenLesen(ordner) {
  const datei = path.join(ordner, "notizen.md");
  if (!existsSync(datei)) return "";
  return readFileSync(datei, "utf8").slice(0, 8000);
}

// ---------- Datei ausliefern (mit Range für Videos) ----------

function dateiSenden(req, res, voll) {
  const st = statSync(voll);
  const typ = typVonEndung(voll);
  const header = {
    "Content-Type": typ,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=60",
    "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
    "Content-Disposition": "inline"
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    let ende = range[1] && range[2] ? Number(range[2]) : st.size - 1;
    ende = Math.min(ende, st.size - 1);
    if (start > ende || start >= st.size) {
      senden(res, 416, "", { "Content-Range": `bytes */${st.size}` });
      return;
    }
    res.writeHead(206, { ...GRUND_HEADER, ...header, "Content-Range": `bytes ${start}-${ende}/${st.size}`, "Content-Length": ende - start + 1 });
    createReadStream(voll, { start, end: ende }).pipe(res);
    return;
  }
  res.writeHead(200, { ...GRUND_HEADER, ...header, "Content-Length": st.size });
  if (req.method === "HEAD") { res.end(); return; }
  createReadStream(voll).pipe(res);
}

// ---------- Server ----------

/**
 * Erstellt den Server. aiqora: Client aus aiqora.mjs (oder ein Ersatz in Tests).
 * token: Zufalls-Kennwort dieses Starts. Rückgabe: http.Server (noch nicht gestartet).
 */
export function erstelleServer({ token, aiqora, beimZugriff = () => {} }) {
  if (!token || token.length < 20) throw new Error("Token fehlt oder ist zu kurz.");

  const server = http.createServer(async (req, res) => {
    beimZugriff();
    const port = server.address()?.port;
    const erlaubteHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    const host = String(req.headers.host || "").toLowerCase();
    if (!erlaubteHosts.includes(host)) { senden(res, 421, "Falscher Host."); return; }

    const url = new URL(req.url, `http://${host}`);
    const cookieName = `aiqora_studio_${port}`;

    // Ping ohne Sitzung: verrät nur, dass hier das Studio läuft.
    if (url.pathname === "/api/ping") { json(res, 200, { app: "aiqora-studio" }); return; }
    if ((req.method === "GET" || req.method === "HEAD") && OEFFENTLICH.has(url.pathname)) {
      const [datei, typ] = STATISCH[url.pathname];
      senden(res, 200, readFileSync(path.join(WEB_ORDNER, datei)), { "Content-Type": typ, "Cache-Control": "public, max-age=86400" });
      return;
    }

    // Einstieg: Kennwort aus dem Link gegen ein Sitzungs-Cookie tauschen.
    if (url.pathname === "/start") {
      if (!gleich(url.searchParams.get("t") || "", token)) { senden(res, 403, SEITE_OHNE_SITZUNG, { "Content-Type": "text/html; charset=utf-8" }); return; }
      senden(res, 303, "", {
        "Location": "/",
        "Set-Cookie": `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`,
        "Cache-Control": "no-store"
      });
      return;
    }

    if (!gleich(cookieLesen(req, cookieName), token)) {
      const istApi = url.pathname.startsWith("/api/") || url.pathname === "/datei";
      if (istApi) json(res, 401, { fehler: "Keine Sitzung. Bitte das Studio über den Desktop-Knopf öffnen." });
      else senden(res, 401, SEITE_OHNE_SITZUNG, { "Content-Type": "text/html; charset=utf-8" });
      return;
    }

    // Alles, was etwas verändert: nur von der eigenen Seite.
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = String(req.headers.origin || "");
      if (!erlaubteHosts.some((h) => origin === `http://${h}`) || req.headers["x-aiqora-studio"] !== "1") {
        json(res, 403, { fehler: "Nicht erlaubt." });
        return;
      }
    }

    try {
      await bearbeiten(req, res, url, aiqora);
    } catch (e) {
      if (e instanceof SchluesselFehler) { json(res, 401, { fehler: e.message, schluessel: true }); return; }
      if (e instanceof Fehler) { json(res, 400, { fehler: e.message }); return; }
      process.stderr.write(`[aiqora-oberflaeche] ${e?.stack || e}\n`);
      json(res, 500, { fehler: "Unerwarteter Fehler im Studio." });
    }
  });
  return server;
}

async function bearbeiten(req, res, url, aiqora) {
  const p = url.pathname;
  const get = req.method === "GET" || req.method === "HEAD";

  if (get && STATISCH[p]) {
    const [datei, typ] = STATISCH[p];
    senden(res, 200, readFileSync(path.join(WEB_ORDNER, datei)), {
      "Content-Type": typ, "Content-Security-Policy": CSP, "Cache-Control": "no-cache"
    });
    return;
  }

  if (get && p === "/api/status") {
    const k = await schluessel.finden();
    json(res, 200, {
      version: version(),
      studio_ordner: studioOrdner(),
      projekte_vorhanden: existsSync(projekteOrdner()),
      schluessel: Boolean(k.wert),
      schluessel_quelle: k.quelle,
      plattform: process.platform
    });
    return;
  }

  if (get && p === "/api/konto") {
    const r = await aiqora.aufrufen("aiqora_get_credit_balance");
    const guthaben = Number(r.effectiveBalance ?? r.credits?.effective_balance ?? r.balance);
    json(res, 200, { guthaben: Number.isFinite(guthaben) ? guthaben : null });
    return;
  }

  if (get && p === "/api/auftraege") {
    const args = { limit: Math.min(50, Math.max(1, Number(url.searchParams.get("anzahl")) || 25)) };
    const vor = url.searchParams.get("vor");
    if (vor && /^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(vor)) args.before = vor;
    const r = await aiqora.aufrufen("aiqora_list_transactions", args);
    const eintraege = (r.transactions || []).map((t) => ({
      id: String(t.id || ""),
      betrag: Number(t.amount) || 0,
      art: String(t.type || ""),
      beschreibung: String(t.description || "").slice(0, 200),
      zeit: String(t.created_at || "")
    }));
    json(res, 200, { eintraege, weiter: r.next_before || null });
    return;
  }

  if (get && p === "/api/projekte") {
    json(res, 200, { projekte: projekteListe() });
    return;
  }

  if (get && p === "/api/projekt") {
    const name = url.searchParams.get("name");
    const ordner = projektOrdner(name);
    json(res, 200, { name, dateien: projektDateien(ordner), notizen: notizenLesen(ordner) });
    return;
  }

  if (get && p === "/datei") {
    const ordner = projektOrdner(url.searchParams.get("projekt"));
    const rel = String(url.searchParams.get("pfad") || "");
    const voll = path.resolve(ordner, rel);
    if (!rel || path.isAbsolute(rel) || !liegtIn(ordner, voll) || voll === ordner) throw new Fehler("Ungültiger Pfad.");
    if (!existsSync(voll) || !statSync(voll).isFile()) { json(res, 404, { fehler: "Datei nicht gefunden." }); return; }
    // Auch Verknüpfungen dürfen nicht aus dem Projekt herausführen.
    if (!liegtIn(realpathSync(ordner), realpathSync(voll))) throw new Fehler("Ungültiger Pfad.");
    if (artVon(voll) === "andere") throw new Fehler("Diese Datei kann hier nicht angezeigt werden.");
    dateiSenden(req, res, voll);
    return;
  }

  if (req.method === "POST" && p === "/api/oeffnen") {
    const { projekt, pfad } = await koerperLesen(req);
    if (!projekt) { oeffnen(studioOrdner()); json(res, 200, { ok: true }); return; }
    const ordner = projektOrdner(projekt);
    const ziel = pfad ? path.resolve(ordner, String(pfad)) : ordner;
    if (!liegtIn(ordner, ziel)) throw new Fehler("Ungültiger Pfad.");
    oeffnen(ziel);
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && p === "/api/schluessel") {
    const { schluessel: wert } = await koerperLesen(req);
    if (!schluessel.formatOk(wert)) throw new Fehler("Das sieht nicht wie ein AIQORA-Schlüssel aus.");
    try {
      await aiqora.schluesselPruefen(String(wert).trim());
    } catch (e) {
      if (e instanceof SchluesselFehler) throw new Fehler("AIQORA hat diesen Schlüssel abgelehnt. Bitte prüfe ihn unter aiqora.ai/settings.");
      throw e;
    }
    await schluessel.speichern(wert);
    aiqora.zuruecksetzen?.();
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && p === "/api/schluessel/entfernen") {
    await schluessel.loeschen();
    aiqora.zuruecksetzen?.();
    json(res, 200, { ok: true });
    return;
  }

  json(res, 404, { fehler: "Nicht gefunden." });
}
