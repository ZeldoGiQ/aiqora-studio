#!/usr/bin/env node
// AIQORA Studio – ein Addon installieren.
//   node local/addon.mjs                 Liste der Addons mit Lizenzhinweisen und Stand
//   node local/addon.mjs <name> --ja     installieren; --ja bestätigt, dass die Lizenzhinweise gelesen wurden
// Der lokale Helfer startet dieses Skript im Hintergrund (Werkzeug addon_installieren) und liest den Stand
// über addons_liste. Die Ausgabe ist JSON.
import * as addons from "./lib/addons.mjs";

const [name, ...rest] = process.argv.slice(2);
const sag = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");

if (!name) {
  sag(await addons.liste());
} else if (!addons.ADDONS[name]) {
  sag({ ok: false, fehler: `Dieses Addon gibt es nicht. Möglich sind: ${Object.keys(addons.ADDONS).join(", ")}.` });
  process.exit(1);
} else if (!rest.includes("--ja")) {
  sag({ ok: false, fehler: "Bitte zuerst die Lizenzhinweise lesen und dann mit --ja bestätigen.", lizenzhinweise: addons.ADDONS[name].lizenzhinweise });
  process.exit(1);
} else {
  const r = await addons.installieren(name);
  sag(r);
  process.exit(r.ok ? 0 : 1);
}
