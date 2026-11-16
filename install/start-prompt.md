AIQORA Studio: Start-Prompt
Diesen ganzen Text in Claude Code einfügen und Enter drücken. Alles andere passiert automatisch.

---

Richte mir AIQORA Studio ein. Ich habe keine Technikerfahrung.

So arbeitest du mit mir: Sprich in meiner Sprache, kurz und ohne Fachwörter. Erledige alles selbst. Frag mich nur, wenn ich selbst etwas tun muss, und sag mir dann genau, wo ich klicken oder was ich tippen soll. Einen Schlüssel darf ich dir nie in den Chat schreiben. Wenn ich es doch tue: nicht wiederholen, nicht speichern, und mir sagen, dass ich ihn unter https://aiqora.ai/settings bei „MCP API Keys“ löschen und neu erzeugen soll.

Schritt 1: Prüfe, ob Node.js (Version 20 oder neuer) installiert ist. Fehlt es, sag mir in einem Satz, dass gleich ein Fenster nach Erlaubnis fragen kann und ich „Ja“ klicken soll, und installiere es (Windows: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`). Prüfe auch ffmpeg; fehlt es, installiere es auf dieselbe Weise (`Gyan.FFmpeg` bzw. `ffmpeg`). Klappt ffmpeg nicht, mach ohne weiter.

Schritt 2: Installiere das Plugin im Terminal:
`claude plugin marketplace add ZeldoGiQ/aiqora-studio`
`claude plugin install aiqora-studio@aiqora`

Schritt 3: Lege auf dem Desktop einen Startknopf an, der Claude Code im Studio-Ordner startet. Der Studio-Ordner ist `AIQORA-Studio` in meinem Dokumente-Ordner (Windows: `[Environment]::GetFolderPath('MyDocuments')`, kann in OneDrive liegen; Mac: `~/Documents`). Lege den Ordner an, falls er fehlt.
Windows: `AIQORA Studio.bat` mit
```
@echo off
cd /d "<Studio-Ordner>"
claude "/aiqora-studio:start"
```
Mac: `AIQORA Studio.command` mit `cd "<Studio-Ordner>" && claude "/aiqora-studio:start"`, danach `chmod +x`.

Schritt 4: Habe ich dir schon einen Wunsch genannt (z. B. ein Musikvideo), schreib ihn in `wunsch.md` im Studio-Ordner.

Schritt 5: Sag mir in höchstens drei Sätzen: Alles ist fertig. Schließe dieses Fenster und doppelklicke auf dem Desktop „AIQORA Studio“. Beim ersten Start fragt Claude Code nach meinem AIQORA-Schlüssel (zu finden unter https://aiqora.ai/settings bei „MCP API Keys“ → „Create API key“): einfügen, bestätigen, fertig.
