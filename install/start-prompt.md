AIQORA Studio: Start-Prompt
Diesen ganzen Text in Claude Code einfügen und Enter drücken. Alles andere passiert automatisch.

---

Richte mir AIQORA Studio ein. Ich habe keine Technikerfahrung.

So arbeitest du mit mir: Sprich in meiner Sprache, kurz und ohne Fachwörter. Erledige alles selbst. Frag mich nur, wenn ich selbst etwas tun muss, und sag mir dann genau, wo ich klicken oder was ich tippen soll. Einen Schlüssel darf ich dir nie in den Chat schreiben. Wenn ich es doch tue: nicht wiederholen, nicht speichern, und mir sagen, dass ich ihn unter https://aiqora.ai/settings bei „MCP API Keys“ löschen und neu erzeugen soll.

Schritt 1: Prüfe, ob Node.js (Version 20 oder neuer) installiert ist. Fehlt es, sag mir in einem Satz, dass gleich ein Fenster nach Erlaubnis fragen kann und ich „Ja“ klicken soll, und installiere es (Windows: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`). Prüfe auch ffmpeg; fehlt es, installiere es auf dieselbe Weise (`Gyan.FFmpeg` bzw. `ffmpeg`). Klappt ffmpeg nicht, mach ohne weiter.

Schritt 2: Installiere das Plugin im Terminal:
`claude plugin marketplace add ZeldoGiQ/aiqora-studio`
`claude plugin install aiqora-studio@aiqora`

Schritt 3: Lies in `~/.claude/plugins/known_marketplaces.json` den Eintrag „aiqora“ → `installLocation`. Das ist der Studio-Programmordner. Lege auf dem Desktop einen Startknopf an, der die Studio-Oberfläche öffnet. Gibt es auf dem Desktop schon eine Datei mit demselben Namen, frag mich vorher, ob du sie ersetzen darfst.
Windows: `AIQORA Studio.bat` mit
@echo off
start "" /min node "<Studio-Programmordner>\local\oberflaeche.mjs"
Mac: `AIQORA Studio.command` mit `node "<Studio-Programmordner>/local/oberflaeche.mjs"`, danach `chmod +x`.

Schritt 4: Habe ich dir schon einen Wunsch genannt (z. B. ein Musikvideo), schreib ihn in `wunsch.md` im Ordner `AIQORA-Studio` in meinem Dokumente-Ordner (Windows: `[Environment]::GetFolderPath('MyDocuments')`, kann in OneDrive liegen; Mac: `~/Documents`). Lege den Ordner an, falls er fehlt.

Schritt 5: Starte die Oberfläche einmal (`node "<Studio-Programmordner>/local/oberflaeche.mjs"`), damit sie sich im Browser öffnet. Sag mir dann in höchstens drei Sätzen: Alles ist fertig. Im Browser ist jetzt mein AIQORA Studio offen; beim ersten Mal trage ich unter „Einstellungen“ meinen AIQORA-Schlüssel ein (zu finden unter https://aiqora.ai/settings bei „MCP API Keys“ → „Create API key“). Künftig öffne ich das Studio mit dem Knopf „AIQORA Studio“ auf dem Desktop. Erwähne in einem Satz: Grafik und Soundeffekte kann ich später mit `/aiqora-studio:addons` dazuholen.
