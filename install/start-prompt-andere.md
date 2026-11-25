AIQORA Studio: Start-Prompt für Codex und Antigravity
Diesen ganzen Text in Codex oder Antigravity einfügen und Enter drücken. Alles andere passiert automatisch.
(Für Claude Code gibt es einen eigenen Text: start-prompt.md.)

---

Richte mir AIQORA Studio in diesem Programm ein. Ich habe keine Technikerfahrung.

So arbeitest du mit mir: Sprich in meiner Sprache, kurz und ohne Fachwörter. Erledige alles selbst. Frag mich nur, wenn ich selbst etwas tun muss, und sag mir dann genau, wo ich klicken oder was ich tippen soll. Einen Schlüssel darf ich dir nie in den Chat schreiben. Wenn ich es doch tue: nicht wiederholen, nicht speichern, und mir sagen, dass ich ihn unter https://aiqora.ai/settings bei „MCP API Keys“ löschen und neu erzeugen soll. Schreib nie einen Schlüssel in eine Einstellungsdatei.

Schritt 1: Prüfe, ob Node.js (Version 20 oder neuer) und git installiert sind. Fehlt etwas, sag mir in einem Satz, dass gleich ein Fenster nach Erlaubnis fragen kann und ich „Ja“ klicken soll, und installiere es (Windows: `winget install OpenJS.NodeJS.LTS` bzw. `winget install Git.Git`, Mac: `brew install node git`). Prüfe auch ffmpeg; fehlt es, installiere es auf dieselbe Weise (`Gyan.FFmpeg` bzw. `ffmpeg`). Klappt ffmpeg nicht, mach ohne weiter.

Schritt 2: Lade das Studio in den Ordner `aiqora-studio` in meinem Benutzerordner:
`git clone https://github.com/ZeldoGiQ/aiqora-studio "<Benutzerordner>/aiqora-studio"`
Gibt es den Ordner schon, führe dort stattdessen `git pull` aus.

Schritt 3: Richte das Studio für dieses Programm ein. In Codex:
`node "<Benutzerordner>/aiqora-studio/local/einrichten.mjs" codex`
In Antigravity:
`node "<Benutzerordner>/aiqora-studio/local/einrichten.mjs" antigravity`
Der Befehl trägt die Verbindungen ein, installiert die Befehle des Studios, legt den Ordner `AIQORA-Studio` in meinen Dokumenten an und einen Knopf „AIQORA Studio“ auf dem Desktop. Steht im Ergebnis unter `behalten` ein Name, habe ich schon eine eigene Verbindung mit diesem Namen: Sag mir das in einem Satz und frag, ob du sie ersetzen sollst. Nur bei einem Ja denselben Befehl mit `--ersetzen` am Ende noch einmal ausführen.

Schritt 4: Habe ich dir schon einen Wunsch genannt (z. B. ein Musikvideo), schreib ihn in `wunsch.md` im Ordner `AIQORA-Studio` (der Pfad steht im Ergebnis von Schritt 3 unter `studio_ordner`).

Schritt 5: Starte die Oberfläche einmal (`node "<Benutzerordner>/aiqora-studio/local/oberflaeche.mjs"`), damit sie sich im Browser öffnet. Sag mir dann in höchstens vier Sätzen: Alles ist fertig. Im Browser ist jetzt mein AIQORA Studio offen; beim ersten Mal trage ich unter „Einstellungen“ meinen AIQORA-Schlüssel ein (zu finden unter https://aiqora.ai/settings bei „MCP API Keys“ → „Create API key“). Danach schließe ich dieses Programm einmal ganz und öffne es neu, öffne darin den Ordner `AIQORA-Studio` in meinen Dokumenten und schreibe „Starte das AIQORA Studio“. Erwähne in einem Satz: Grafik und Soundeffekte kann ich später dazuholen, indem ich „Zeig mir die Addons“ schreibe.
