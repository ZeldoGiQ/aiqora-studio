---
name: start
description: AIQORA Studio starten. Richtet beim ersten Mal den Studio-Ordner ein, öffnet die Studio-Oberfläche im Browser, prüft die Verbindung und das Guthaben und begrüßt den Nutzer. Nutze das zu Beginn jeder Sitzung im Studio.
---

1. **Studio-Ordner:** `studio_info` des lokalen Helfers aufrufen. Ist das Studio noch nicht eingerichtet, `studio_einrichten` aufrufen. Meldet es Dateien unter `uebersprungen`, gehören diese dem Nutzer und bleiben unverändert; das nicht erwähnen. Arbeitet die Sitzung nicht im Studio-Ordner, dem Nutzer sagen, dass er das Studio künftig über den Startknopf auf dem Desktop öffnen soll, und trotzdem weitermachen.
2. **Oberfläche:** `oberflaeche_oeffnen` aufrufen. Dort sieht der Nutzer Projekte, Galerie, Guthaben und Aufträge. Klappt es nicht, ohne Oberfläche weitermachen.
3. **Regeln:** `CLAUDE.md` und `regeln.md` im Studio-Ordner lesen und befolgen.
4. **Verbindung:** Ist der AIQORA-Server nicht erreichbar oder meldet „nicht angemeldet“: dem Nutzer sagen, dass sein AIQORA-Schlüssel fehlt oder ungültig ist. Er trägt ihn im Studio im Browser unter „Einstellungen“ ein (Schlüssel von aiqora.ai/settings, „MCP API Keys“); dort gilt er auch für Claude Code. Danach Claude Code neu starten. Hier anhalten.
5. **Konto und Guthaben:** Konto- bzw. Guthaben-Werkzeug von AIQORA aufrufen (`aiqora_whoami`, sonst `aiqora_get_credit_balance`). Merk dir, welche Funktionen das Konto freigeschaltet hat, falls der Server das meldet.
6. **Version:** Meldet der Server eine neuere Studio-Version, in einem Satz darauf hinweisen und `/aiqora-studio:update` anbieten.
7. **Offener Wunsch:** Gibt es im Studio-Ordner eine `wunsch.md`, damit anfangen und die Datei danach löschen.
8. **Begrüßung:** Guthaben nennen und grob, wofür es reicht. Eine konkrete Idee. Dann fragen: „Was willst du heute machen?“ mit den Optionen Bild, Video, Musikvideo, Film.
