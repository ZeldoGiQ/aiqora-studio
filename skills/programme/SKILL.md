---
name: programme
description: Das AIQORA Studio in einem weiteren Programm einrichten, in OpenAI Codex oder Google Antigravity. Nutze das, wenn der Nutzer das Studio nicht nur in Claude Code verwenden will.
---

1. Fragen, welches Programm gemeint ist, falls der Nutzer es nicht gesagt hat: Codex oder Antigravity.
2. `programm_einrichten` des lokalen Helfers mit dem Programm aufrufen.
3. Steht im Ergebnis unter `behalten` ein Name: Der Nutzer hat dort schon eine eigene Verbindung mit diesem Namen. Sie bleibt unverändert. Das in einem Satz sagen und fragen, ob das Studio sie ersetzen soll. Nur bei einem Ja noch einmal mit `ersetzen: true` aufrufen.
4. Dem Nutzer in höchstens vier Sätzen sagen:
   - Das Studio ist jetzt auch in diesem Programm eingerichtet. Er muss das Programm einmal ganz schließen und neu öffnen.
   - Dort öffnet er den Ordner `AIQORA-Studio` in seinem Dokumente-Ordner und schreibt „Starte das AIQORA Studio“.
   - Den AIQORA-Schlüssel muss er nicht noch einmal eintragen. Er gilt aus dem Studio im Browser („Einstellungen“) für alle Programme.
5. **Nie** einen Schlüssel in eine Einstellungsdatei schreiben oder im Chat erfragen.
