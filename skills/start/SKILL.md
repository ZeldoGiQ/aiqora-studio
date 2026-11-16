---
name: start
description: AIQORA Studio starten. Richtet beim ersten Mal den Studio-Ordner ein, prüft die Verbindung und das Guthaben und begrüßt den Nutzer. Nutze das zu Beginn jeder Sitzung im Studio.
---

1. **Studio-Ordner:** `studio_info` des lokalen Helfers aufrufen. Ist das Studio noch nicht eingerichtet, `studio_einrichten` aufrufen. Arbeitet die Sitzung nicht im Studio-Ordner, dem Nutzer sagen, dass er das Studio künftig über den Startknopf auf dem Desktop oder in diesem Ordner öffnen soll, und trotzdem weitermachen.
2. **Regeln:** `CLAUDE.md` und `regeln.md` im Studio-Ordner lesen und befolgen.
3. **Verbindung:** Ist der AIQORA-Server nicht erreichbar oder meldet „nicht angemeldet“: dem Nutzer sagen, dass sein AIQORA-Schlüssel fehlt oder ungültig ist. Er trägt ihn ein über `/plugin` → AIQORA Studio → Einstellungen (Schlüssel von aiqora.ai/settings, „MCP API Keys“). Danach Claude Code neu starten. Hier anhalten.
4. **Konto und Guthaben:** Konto- bzw. Guthaben-Werkzeug von AIQORA aufrufen (`aiqora_whoami`, sonst `aiqora_get_credit_balance`). Merk dir, welche Funktionen das Konto freigeschaltet hat, falls der Server das meldet.
5. **Version:** Meldet der Server eine neuere Studio-Version, in einem Satz darauf hinweisen und `/aiqora-studio:update` anbieten.
6. **Dashboard:** `dashboard_aktualisieren` mit Guthaben und Stand aufrufen. Beim ersten Start des Tages das Dashboard mit `datei_oeffnen` öffnen.
7. **Offener Wunsch:** Gibt es im Studio-Ordner eine `wunsch.md`, damit anfangen und die Datei danach löschen.
8. **Begrüßung:** Guthaben nennen und grob, wofür es reicht. Eine konkrete Idee. Dann fragen: „Was willst du heute machen?“ mit den Optionen Bild, Video, Musikvideo, Film.
