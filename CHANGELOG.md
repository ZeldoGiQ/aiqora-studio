# Was ist neu

Hier steht in einfachen Worten, was sich in jeder Version geändert hat.

## 0.4.1

- Ein Start-Text für alle: `install/start-prompt.md` gilt jetzt für Claude Code, Codex und Antigravity. Den zweiten Text (`start-prompt-andere.md`) gibt es nicht mehr.

## 0.4.0

- **Neu: Addons.** Nach der Installation kannst du Zusatzprogramme für Grafik und Ton dazuholen: **HyperFrames** (Erklärgrafiken, Titel, Untertitel) und **Earshot** (Soundeffekte, Tonprüfung). Sag „Zeig mir die Addons“ oder tippe `/aiqora-studio:addons`. Die normale Installation bleibt, wie sie war.
- Vor jeder Installation zeigt das Studio die Lizenzhinweise, auch dazu, was du kommerziell nutzen darfst und was nicht. Ohne dein Ja wird nichts installiert.
- Addons liegen nicht im Studio, sondern werden von ihrer Originalquelle geladen. Ihre Regeln und Lizenzhinweise stehen danach in `addons.md` im Studio-Ordner, und der Assistent hält sich daran, zum Beispiel: Musik kommt immer von AIQORA, weil die lokale Musik-Notlösung von HyperFrames nicht kommerziell nutzbar ist.

## 0.3.0

- **Neu: Das Studio läuft auch ohne Claude.** Es lässt sich in **OpenAI Codex** und **Google Antigravity** einrichten. In Claude Code reicht dafür ein Satz („Richte das Studio auch in Codex ein“) oder `/aiqora-studio:programme`. Für Nutzer ohne Claude Code gibt es einen eigenen Start-Text (seit 0.4.1 ist es derselbe wie für Claude Code: `install/start-prompt.md`).
- **Neu: Lokale Modelle.** Mit Ollama, LM Studio oder llama.cpp läuft der Assistent auf deinem eigenen Rechner. `/aiqora-studio:lokal` legt dafür den Desktop-Knopf „AIQORA Studio (lokal)“ an. Bilder, Videos und Musik kommen weiter von AIQORA und kosten Guthaben.
- Mit einem lokalen Modell fragt das Studio vor jedem Auftrag nach, der Guthaben kosten oder etwas löschen kann. Kleine Modelle halten sich schlechter an Regeln; diese Frage hängt deshalb nicht vom Modell ab.
- Den AIQORA-Schlüssel trägst du weiter nur einmal ein, im Studio im Browser. Er gilt für alle Programme. In den Einstellungen von Codex und Antigravity steht kein Schlüssel.
- Eigene Einstellungen in Codex und Antigravity bleiben unangetastet: Das Studio ersetzt dort nichts, was es nicht selbst angelegt hat, und sichert die Datei vor jeder Änderung.

## 0.2.2

- Behoben: Ein im Studio eingetragener AIQORA-Schlüssel ging verloren, wenn das Studio einmal aus Claude heraus und später über den Desktop-Knopf gestartet wurde. Er wurde dann abgelehnt. Das Studio speichert seine Daten jetzt an einem Ort, den Windows nicht umleitet, und übernimmt einen schon eingetragenen Schlüssel automatisch.

## 0.2.1

- Den AIQORA-Schlüssel trägst du nur noch einmal ein: im Studio im Browser unter „Einstellungen“. Er gilt dann auch in Claude Code. Claude Code fragt nicht mehr zusätzlich danach.

## 0.2.0

- Erste Version des Studios als Claude-Code-Plugin.
- Befehle für Start, Bild, Video, Musik, Musikvideo, Cinema Agent, Short Drama, Doku, Figuren, Status, Hilfe und Update.
- Lokaler Helfer für Projektordner, Herunter- und Hochladen, einfache Schnitte und das Dashboard.
- Eigene Schlüssel (BYOK) werden sicher auf deinem Rechner gespeichert. Erzeugen mit eigenem Schlüssel folgt in einer späteren Version.
- **Neu: Studio-Oberfläche im Browser.** Der Knopf „AIQORA Studio“ auf dem Desktop öffnet dein Studio als Webseite auf deinem eigenen Rechner: Projekte mit Galerie und Player, Guthaben, Aufträge mit Kosten und Einstellungen. Den AIQORA-Schlüssel trägst du dort ein; er wird verschlüsselt auf deinem Rechner gespeichert.
- Das Einrichten überschreibt keine eigenen Dateien mehr, die zufällig so heißen wie die Vorlagen des Studios.
