---
name: addons
description: Addons für das AIQORA Studio zeigen und installieren, zum Beispiel HyperFrames für Erklärgrafiken und Untertitel oder Earshot für Soundeffekte und Tonprüfung. Zeigt vor jeder Installation die Lizenzhinweise. Nutze das, wenn der Nutzer nach Addons, Grafik, Titeln, Untertiteln oder Soundeffekten fragt.
---

Addons sind Zusatzprogramme anderer Anbieter. Sie gehören nicht zum Studio und werden erst installiert, wenn der Nutzer es will.

1. `addons_liste` des lokalen Helfers aufrufen.
2. Dem Nutzer die Addons kurz zeigen: Name, wofür es gut ist, Größe und ob es schon installiert ist. Fragen, welches er installieren will. Läuft gerade eine Installation, den Stand nennen.
3. **Vor jeder Installation die Lizenzhinweise zeigen.** `addon_installieren` mit dem Namen aufrufen, ohne `lizenz_bestaetigt`. Die gelieferten Lizenzhinweise vollständig und in einfachen Worten wiedergeben, dazu Anbieter, Lizenz und Größe. Dazusagen: Die Hinweise haben den Stand aus `lizenz_stand` und sind keine Rechtsberatung. Dann fragen: „Einverstanden, soll ich es installieren?“
4. Nur nach einem ausdrücklichen Ja: `addon_installieren` mit `lizenz_bestaetigt: true` aufrufen. Dem Nutzer sagen, dass die Installation im Hintergrund läuft und wie lange es etwa dauert (Earshot lädt etwa 1 GB).
5. Nach frühestens einer Minute mit `addons_liste` nachsehen. Steht dort `fertig`:
   - Dem Nutzer sagen, dass er das Programm einmal ganz schließen und neu öffnen muss.
   - Bei Earshot in Claude Code: Beim nächsten Start fragt Claude Code einmal, ob es die neue Verbindung „earshot“ im Studio-Ordner nutzen darf. Er klickt „Ja“.
   - `addons.md` im Studio-Ordner lesen: Dort stehen ab jetzt die Regeln für die Addons.
6. Steht dort `fehler` oder `abgebrochen`: die Meldung in einem Satz in einfachen Worten wiedergeben und anbieten, es noch einmal zu versuchen. Das Studio läuft auch ohne Addons weiter.
7. Nie ein Addon ohne Zustimmung zu den Lizenzhinweisen installieren und nie die Hinweise weglassen oder beschönigen.
