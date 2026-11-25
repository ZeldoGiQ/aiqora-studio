// MCP über stdio: JSON-RPC 2.0, eine Nachricht pro Zeile. Gemeinsam für den lokalen Helfer und die Brücke.
import readline from "node:readline";

export const PROTOKOLL_VERSIONEN = ["2025-06-18", "2025-03-26", "2024-11-05"];

/** Die Protokollversion, mit der geantwortet wird. */
export function protokoll(gewuenscht) {
  return PROTOKOLL_VERSIONEN.includes(gewuenscht) ? gewuenscht : PROTOKOLL_VERSIONEN[0];
}

export function senden(nachricht) {
  process.stdout.write(JSON.stringify(nachricht) + "\n");
}

/** Fehler für unbekannte Methoden. */
export function unbekannt(method) {
  return Object.assign(new Error(`Methode nicht gefunden: ${method}`), { rpcCode: -32601 });
}

/**
 * Liest Anfragen von stdin und beantwortet sie mit bearbeiten(nachricht).
 * bearbeiten liefert das Ergebnis oder wirft einen Fehler (rpcCode setzt den JSON-RPC-Code).
 */
export function starten(bearbeiten) {
  async function zeileVerarbeiten(zeile) {
    if (!zeile.trim()) return;
    let nachricht;
    try { nachricht = JSON.parse(zeile); } catch {
      senden({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Ungültiges JSON" } });
      return;
    }
    const istAnfrage = nachricht.id !== undefined && nachricht.id !== null;
    try {
      const ergebnis = await bearbeiten(nachricht);
      if (istAnfrage) senden({ jsonrpc: "2.0", id: nachricht.id, result: ergebnis ?? {} });
    } catch (e) {
      if (istAnfrage) senden({ jsonrpc: "2.0", id: nachricht.id, error: { code: e.rpcCode || -32603, message: e.message } });
    }
  }
  // Schließt das Programm die Leitung, laufende Anfragen noch beantworten und erst dann beenden.
  const offen = new Set();
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (zeile) => {
    const p = zeileVerarbeiten(zeile).finally(() => offen.delete(p));
    offen.add(p);
  });
  rl.on("close", () => { Promise.allSettled([...offen]).then(() => process.exit(0)); });
}
