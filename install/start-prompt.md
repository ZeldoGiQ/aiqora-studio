AIQORA Studio: Start-Prompt
Diesen ganzen Text in Claude Code, Codex oder Antigravity einfügen und Enter drücken. Alles andere passiert automatisch.

---

Richte mir AIQORA Studio in diesem Programm ein. Ich habe keine Technikerfahrung.

So arbeitest du mit mir: Sprich in meiner Sprache, kurz und ohne Fachwörter. Erledige alles selbst. Frag mich nur, wenn ich selbst etwas tun muss, und sag mir dann genau, wo ich klicken oder was ich tippen soll. Einen Schlüssel darf ich dir nie in den Chat schreiben. Wenn ich es doch tue: nicht wiederholen, nicht speichern, und mir sagen, dass ich ihn unter https://aiqora.ai/settings bei „MCP API Keys“ löschen und neu erzeugen soll. Schreib nie einen Schlüssel in eine Einstellungsdatei.

Schritt 0: Stell fest, in welchem Programm du gerade läufst: Claude Code, Codex oder Antigravity. Bist du dir nicht sicher, frag mich einmal. Läufst du in einem anderen Programm, sag mir, dass das Studio bisher nur diese drei unterstützt, und hör hier auf.

Schritt 1: Prüfe, ob Node.js (Version 20 oder neuer) installiert ist. Fehlt es, sag mir in einem Satz, dass gleich ein Fenster nach Erlaubnis fragen kann und ich „Ja“ klicken soll, und installiere es (Windows: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`). Prüfe auch ffmpeg; fehlt es, installiere es auf dieselbe Weise (`Gyan.FFmpeg` bzw. `ffmpeg`). Klappt ffmpeg nicht, mach ohne weiter. Nur in Codex und Antigravity brauchst du zusätzlich git (Windows: `winget install Git.Git`, Mac: `brew install git`).

Schritt 2: Installiere das Studio. Der Ordner, in dem es danach liegt, heißt ab hier „Programmordner“.

In Claude Code:
`claude plugin marketplace add ZeldoGiQ/aiqora-studio`
`claude plugin install aiqora-studio@aiqora`
Der Programmordner steht in `~/.claude/plugins/known_marketplaces.json` beim Eintrag „aiqora“ unter `installLocation`.

In Codex oder Antigravity:
`git clone https://github.com/ZeldoGiQ/aiqora-studio "<Benutzerordner>/aiqora-studio"`
Gibt es den Ordner schon, führe dort stattdessen `git pull` aus. Der Programmordner ist `<Benutzerordner>/aiqora-studio`.

Schritt 3: Richte das Studio für dieses Programm ein.

In Claude Code: Lege auf dem Desktop einen Startknopf an, der die Studio-Oberfläche öffnet. Gibt es dort schon eine Datei mit demselben Namen, frag mich vorher, ob du sie ersetzen darfst.
Windows: `AIQORA Studio.bat` mit
@echo off
start "" /min node "<Programmordner>\local\oberflaeche.mjs"
Mac: `AIQORA Studio.command` mit `node "<Programmordner>/local/oberflaeche.mjs"`, danach `chmod +x`.
Lege außerdem den Ordner `AIQORA-Studio` in meinem Dokumente-Ordner an, falls er fehlt (Windows: `[Environment]::GetFolderPath('MyDocuments')`, kann in OneDrive liegen; Mac: `~/Documents`).

In Codex: `node "<Programmordner>/local/einrichten.mjs" codex`
In Antigravity: `node "<Programmordner>/local/einrichten.mjs" antigravity`
Der Befehl trägt die Verbindungen ein, installiert die Befehle des Studios, legt den Ordner `AIQORA-Studio` in meinen Dokumenten an und einen Knopf „AIQORA Studio“ auf dem Desktop. Steht im Ergebnis unter `behalten` ein Name, habe ich schon eine eigene Verbindung mit diesem Namen: Sag mir das in einem Satz und frag, ob du sie ersetzen sollst. Nur bei einem Ja denselben Befehl mit `--ersetzen` am Ende noch einmal ausführen.

Schritt 4: Habe ich dir schon einen Wunsch genannt (z. B. ein Musikvideo), schreib ihn in `wunsch.md` im Ordner `AIQORA-Studio` in meinen Dokumenten.

Schritt 5: Starte die Oberfläche einmal (`node "<Programmordner>/local/oberflaeche.mjs"`), damit sie sich im Browser öffnet. Sag mir dann in höchstens vier Sätzen:
- Alles ist fertig. Im Browser ist jetzt mein AIQORA Studio offen; beim ersten Mal trage ich unter „Einstellungen“ meinen AIQORA-Schlüssel ein (zu finden unter https://aiqora.ai/settings bei „MCP API Keys“ → „Create API key“). Er gilt dann für alle Programme.
- In Claude Code: Ich starte Claude Code einmal neu und tippe `/aiqora-studio:start`. Künftig öffne ich das Studio mit dem Knopf „AIQORA Studio“ auf dem Desktop.
- In Codex oder Antigravity: Ich schließe das Programm einmal ganz und öffne es neu, öffne darin den Ordner `AIQORA-Studio` in meinen Dokumenten und schreibe „Starte das AIQORA Studio“.
- Grafik und Soundeffekte kann ich später dazuholen, indem ich „Zeig mir die Addons“ schreibe.

Installiere in diesem Durchgang keine Addons und kein lokales Modell. Das mache ich später selbst, wenn ich es will.
