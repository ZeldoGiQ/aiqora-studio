// Welche Werkzeuge können Guthaben kosten oder etwas löschen?
// Bewusst andersherum gedacht: Nur was sicher nichts kostet, ist frei. Neue Werkzeuge des AIQORA-Servers
// gelten damit automatisch als kostenpflichtig, bis sie hier als frei erkannt werden.
const FREI = /^aiqora_(list_|get_|wait_|whoami$|help$|werkzeuge$|beschreibung$|anmelden$)/;

/**
 * name: Werkzeugname, auch mit Vorsatz von Claude Code (mcp__…__aiqora_whoami).
 * eingaben: die Eingaben des Aufrufs. Im Sparmodus der Brücke steht das eigentliche Werkzeug in eingaben.name.
 */
export function kostetOderLoescht(name, eingaben) {
  let werkzeug = String(name || "").split("__").pop();
  if (werkzeug === "aiqora_aufruf") werkzeug = String(eingaben?.name || "aiqora_unbekannt");
  if (/^byok_/.test(werkzeug)) return werkzeug !== "byok_status"; // eigener Schlüssel: kostet beim Anbieter
  if (/^aiqora_/.test(werkzeug)) return !FREI.test(werkzeug);
  return false; // lokaler Helfer: Ordner, Schnitte, Dashboard
}
