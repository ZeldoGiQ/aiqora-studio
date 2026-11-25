// Spricht MCP über HTTP mit dem AIQORA-Server. Ohne Zusatzpakete.
// Der Schlüssel wird nur im Authorization-Header verwendet und nie geloggt oder zurückgegeben.
import { Fehler, umgebung } from "./pfade.mjs";
import { version } from "./studio.mjs";

const STANDARD_URL = "https://sfqaotcueeifbrlttasu.supabase.co/functions/v1/mcp";
const PROTOKOLL = "2025-06-18";

export function serverUrl() {
  const eigen = umgebung("AIQORA_MCP_URL");
  if (!eigen) return STANDARD_URL;
  const u = new URL(eigen);
  const lokal = u.hostname === "127.0.0.1" || u.hostname === "localhost";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && lokal)) throw new Fehler("AIQORA_MCP_URL muss mit https:// beginnen.");
  return u.toString();
}

export class SchluesselFehler extends Fehler {}

/** JSON- oder SSE-Antwort lesen und die JSON-RPC-Nachricht liefern. */
function antwortLesen(text) {
  const t = text.trim();
  if (!t) return {};
  if (t.startsWith("{")) return JSON.parse(t);
  const daten = t.split("\n").filter((z) => z.startsWith("data:")).map((z) => z.slice(5).trim()).filter(Boolean);
  return daten.length ? JSON.parse(daten[daten.length - 1]) : {};
}

/** Ergebnis eines tools/call als Objekt (structuredContent, sonst JSON aus dem Text). */
export function ergebnisLesen(result) {
  if (result?.structuredContent && typeof result.structuredContent === "object") return result.structuredContent;
  const text = (result?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  try { return JSON.parse(text); } catch { return { text }; }
}

/**
 * schluesselHolen: liefert den Schlüssel oder "". optionen.name: wie sich der Client beim Server meldet,
 * optionen.zeitlimitMs: wie lange eine Antwort dauern darf.
 */
export function erstelleClient(schluesselHolen, optionen = {}) {
  const clientName = optionen.name || "aiqora-studio-oberflaeche";
  const zeitlimitMs = optionen.zeitlimitMs || 90000;
  let sitzung = null;
  let naechsteId = 1;

  async function senden(nachricht, schluessel) {
    let antwort;
    try {
      antwort = await fetch(serverUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": `Bearer ${schluessel}`,
          ...(sitzung ? { "Mcp-Session-Id": sitzung } : {})
        },
        body: JSON.stringify(nachricht),
        signal: AbortSignal.timeout(zeitlimitMs)
      });
    } catch {
      throw new Fehler("AIQORA ist gerade nicht erreichbar. Bitte prüfe deine Internetverbindung.");
    }
    if (antwort.status === 401 || antwort.status === 403) {
      throw new SchluesselFehler("Dein AIQORA-Schlüssel fehlt oder ist ungültig.");
    }
    if (antwort.status === 404 && sitzung) {
      sitzung = null;
      throw Object.assign(new Fehler("Sitzung abgelaufen."), { sitzungWeg: true });
    }
    if (!antwort.ok && antwort.status !== 202) throw new Fehler(`AIQORA hat mit einem Fehler geantwortet (Status ${antwort.status}).`);
    sitzung = antwort.headers.get("mcp-session-id") || sitzung;
    return antwortLesen(await antwort.text());
  }

  async function verbinden(schluessel) {
    sitzung = null;
    const r = await senden({
      jsonrpc: "2.0", id: naechsteId++, method: "initialize",
      params: { protocolVersion: PROTOKOLL, capabilities: {}, clientInfo: { name: clientName, version: version() } }
    }, schluessel);
    if (r.error) throw new Fehler("Die Verbindung zu AIQORA konnte nicht aufgebaut werden.");
    await senden({ jsonrpc: "2.0", method: "notifications/initialized" }, schluessel);
  }

  let verbunden = null; // Promise der laufenden Verbindung
  let verbundenMit = "";

  /**
   * Reicht eine MCP-Anfrage unverändert an AIQORA durch und liefert die JSON-RPC-Antwort ({ result } oder { error }).
   * Baut die Verbindung bei Bedarf auf und nach abgelaufener Sitzung einmal neu.
   */
  async function weiterleiten(method, params, versuch = 0) {
    const schluessel = await schluesselHolen();
    if (!schluessel) throw new SchluesselFehler("Es ist noch kein AIQORA-Schlüssel eingetragen.");
    if (!verbunden || verbundenMit !== schluessel) {
      verbundenMit = schluessel;
      verbunden = verbinden(schluessel).catch((e) => { verbunden = null; throw e; });
    }
    await verbunden;
    try {
      return await senden({ jsonrpc: "2.0", id: naechsteId++, method, params }, schluessel);
    } catch (e) {
      if (e.sitzungWeg && versuch === 0) { verbunden = null; return weiterleiten(method, params, 1); }
      throw e;
    }
  }

  /** Ruft ein AIQORA-Werkzeug auf und liefert das Ergebnis als Objekt. */
  async function aufrufen(name, args = {}) {
    const r = await weiterleiten("tools/call", { name, arguments: args });
    if (r.error) throw new Fehler(String(r.error.message || "Unbekannter Fehler bei AIQORA.").slice(0, 300));
    const daten = ergebnisLesen(r.result);
    if (r.result?.isError) {
      const meldung = daten?.error?.message || daten?.error || daten?.text || "AIQORA meldet einen Fehler.";
      throw new Fehler(String(typeof meldung === "string" ? meldung : JSON.stringify(meldung)).slice(0, 300));
    }
    return daten;
  }

  /** Prüft einen Schlüssel, ohne die bestehende Verbindung zu stören. */
  async function schluesselPruefen(schluessel) {
    const probe = erstelleClient(async () => schluessel);
    await probe.aufrufen("aiqora_get_credit_balance");
    return true;
  }

  return { aufrufen, weiterleiten, schluesselPruefen, zuruecksetzen: () => { verbunden = null; sitzung = null; } };
}
