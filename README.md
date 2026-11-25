# AIQORA Studio

**Dein fertiges KI-Studio für Bilder, Videos, Musik und Musikvideos, direkt in Claude Code. Ohne Programmieren.**

Läuft auch in **OpenAI Codex** und **Google Antigravity** und mit **lokalen Modellen** (Ollama, LM Studio, llama.cpp).

*[English version below](#english)*

AIQORA Studio verbindet Claude Code mit [AIQORA](https://aiqora.ai). Du sagst in normaler Sprache, was du willst („Mach mir ein Musikvideo zu meinem Song“), das Studio kümmert sich um den Rest: Kosten vorher ansagen, erzeugen lassen, herunterladen, öffnen.

- **Alles in einem Ordner:** jedes Vorhaben bekommt einen Projektordner mit Bildern, Clips, Ton und dem fertigen Ergebnis.
- **Eigene Oberfläche:** Das Studio öffnet sich im Browser, läuft aber nur auf deinem Rechner. Projekte mit Galerie und Player, Guthaben und Aufträge auf einen Blick.
- **Spart deine Claude-Tokens:** Aufwendige Abläufe (Musikvideo, Cinema Agent, Short Drama) laufen als ein einziger Auftrag bei AIQORA, nicht als hunderte Einzelschritte auf deinem Rechner.
- **Updates inklusive:** neue Funktionen kommen automatisch.

## Was du brauchst

1. [Claude Code](https://claude.com/claude-code) (Desktop-App oder Terminal). Oder Codex oder Antigravity, siehe [Andere Programme](#andere-programme-und-lokale-modelle).
2. Ein [AIQORA-Konto](https://aiqora.ai) mit Guthaben
3. Optional: [ffmpeg](https://ffmpeg.org) für einfache Schnitte auf deinem Rechner

## Installation in 3 Schritten

**Einfachster Weg:** Öffne Claude Code, Codex oder Antigravity, füge den Text aus [`install/start-prompt.md`](install/start-prompt.md) ein und drücke Enter. Das Programm erledigt den Rest. Es ist ein Text für alle drei.

**Oder von Hand:**

1. In Claude Code eintippen:
   ```
   /plugin marketplace add ZeldoGiQ/aiqora-studio
   /plugin install aiqora-studio@aiqora
   ```
2. Fragt Claude Code nach dem AIQORA-Schlüssel, das Feld einfach leer lassen. Du trägst den Schlüssel einmal im Studio im Browser unter „Einstellungen“ ein, dann gilt er überall, auch in Claude Code. Du findest ihn unter [aiqora.ai/settings](https://aiqora.ai/settings) bei „MCP API Keys“. Er wird verschlüsselt auf deinem Rechner gespeichert und nie im Chat angezeigt.
3. Claude Code neu starten und eintippen:
   ```
   /aiqora-studio:start
   ```

## Was du tippen kannst

| Befehl | Was passiert |
|---|---|
| `/aiqora-studio:start` | Studio öffnen, Guthaben, Begrüßung |
| `/aiqora-studio:idee` | Drei Ideen, wenn dir nichts einfällt |
| `/aiqora-studio:bild` | Ein Bild erzeugen |
| `/aiqora-studio:video` | Einen Videoclip erzeugen |
| `/aiqora-studio:musik` | Einen Song erzeugen |
| `/aiqora-studio:musikvideo` | Ein fertiges Musikvideo zu deinem Song |
| `/aiqora-studio:cinema` | Ein Film mit dem AIQORA Cinema Agent |
| `/aiqora-studio:shortdrama` | Eine Short-Drama-Episode |
| `/aiqora-studio:doku` | Eine kurze Dokumentation |
| `/aiqora-studio:figur` | Deine Figuren ansehen, anlegen, neu einkleiden |
| `/aiqora-studio:status` | Guthaben und laufende Aufträge |
| `/aiqora-studio:schluessel` | Eigene Anbieter-Schlüssel (BYOK) prüfen |
| `/aiqora-studio:addons` | Grafik und Soundeffekte dazuholen (HyperFrames, Earshot) |
| `/aiqora-studio:lokal` | Studio mit einem lokalen Modell nutzen |
| `/aiqora-studio:programme` | Studio auch in Codex oder Antigravity einrichten |
| `/aiqora-studio:update` | Auf die neueste Version bringen |
| `/aiqora-studio:hilfe` | Hilfe |

Du musst keinen Befehl kennen: Sag einfach, was du willst.

## Kosten

Erzeugen kostet AIQORA-Credits. Das Studio nennt die Kosten **vor** jedem Auftrag und fragt bei größeren Beträgen nach. Fehlgeschlagene Aufträge bucht AIQORA zurück.

## Eigene Schlüssel (BYOK)

Mit einem AIQORA-Abo kannst du für einfache Einzelbilder und -clips auch deine eigenen Schlüssel von Drittanbietern nutzen. **Deine Schlüssel bleiben auf deinem Rechner.** Claude Code speichert sie im sicheren Speicher deines Systems, AIQORA bekommt sie nie zu sehen, und Aufträge mit eigenem Schlüssel laufen direkt von deinem Rechner zum Anbieter. Die Kosten beim Anbieter trägst du selbst.

Fertige Abläufe wie Musikvideo, Cinema Agent und Short Drama laufen immer über AIQORA und kosten Credits.

## Addons: Grafik und Soundeffekte

Nach der Installation kannst du Zusatzprogramme anderer Anbieter dazuholen: **HyperFrames** für Erklärgrafiken, Titel und Untertitel, **Earshot** für Soundeffekte und Tonprüfung. Sie sind nicht von Anfang an dabei. Sag im Studio „Zeig mir die Addons“: Du siehst vor jeder Installation die Lizenzhinweise, auch dazu, was du kommerziell nutzen darfst und was nicht. Alles Weitere steht in [`docs/addons.md`](docs/addons.md).

## Andere Programme und lokale Modelle

Das Studio ist nicht an Claude gebunden.

| Womit | So geht es | Anleitung |
|---|---|---|
| **OpenAI Codex** | Text aus [`install/start-prompt.md`](install/start-prompt.md) in Codex einfügen | [`docs/codex.md`](docs/codex.md) |
| **Google Antigravity** | Denselben Text in Antigravity einfügen | [`docs/antigravity.md`](docs/antigravity.md) |
| **Lokales Modell** (Ollama, LM Studio, llama.cpp) | In Claude Code `/aiqora-studio:lokal` tippen, dann den Knopf „AIQORA Studio (lokal)“ auf dem Desktop nutzen | [`docs/lokal.md`](docs/lokal.md) |

Nutzt du das Studio schon in Claude Code, reicht dort ein Satz: „Richte das Studio auch in Codex ein.“

Den AIQORA-Schlüssel trägst du in jedem Fall nur einmal ein, im Studio im Browser unter „Einstellungen“. In den Einstellungen der anderen Programme steht kein Schlüssel.

Ein lokales Modell ersetzt nur den Assistenten. Bilder, Videos und Musik kommen weiter von AIQORA und kosten Guthaben.

## Sicherheit und Datenschutz

- Schlüssel gehören nie in den Chat. Wenn es doch passiert: Schlüssel unter [aiqora.ai/settings](https://aiqora.ai/settings) löschen und neu erzeugen.
- Das Studio veröffentlicht nichts ohne dein ausdrückliches Ja.
- Sicherheitsprobleme bitte wie in [`SECURITY.md`](SECURITY.md) beschrieben melden.

---

## English

**Your ready-made AI studio for images, videos, music and music videos, right inside Claude Code. No coding.**

AIQORA Studio connects Claude Code to [AIQORA](https://aiqora.ai). Say what you want in plain language ("make a music video for my song"); the studio announces the cost, runs the job, downloads and opens the result.

### Install

1. In Claude Code:
   ```
   /plugin marketplace add ZeldoGiQ/aiqora-studio
   /plugin install aiqora-studio@aiqora
   ```
2. If Claude Code asks for the AIQORA key, leave it empty. Enter your key once in the studio in your browser under "Einstellungen" (settings); it then applies everywhere, Claude Code included. Get it from [aiqora.ai/settings](https://aiqora.ai/settings) ("MCP API Keys"). It is stored encrypted on your computer and never shown in the chat.
3. Restart Claude Code and type `/aiqora-studio:start`.

Generating costs AIQORA credits; the studio always tells you the cost first. Subscribers can bring their own provider keys (BYOK) for simple single generations. **BYOK keys never leave your computer** and are never sent to AIQORA. Full workflows (music video, Cinema Agent, Short Drama) always run on AIQORA.

**Not Claude-only:** the studio also runs in OpenAI Codex ([`docs/codex.md`](docs/codex.md)) and Google Antigravity ([`docs/antigravity.md`](docs/antigravity.md)): paste [`install/start-prompt.md`](install/start-prompt.md) into any of the three; it is one prompt for all. It also runs on local models via Ollama, LM Studio or llama.cpp ([`docs/lokal.md`](docs/lokal.md)); a local model only replaces the assistant, generation still runs on AIQORA and costs credits. You enter the AIQORA key once, in the studio's browser UI; no key is written into those programs' config files.

**Add-ons:** after installing you can add third-party tools for graphics and sound (HyperFrames, Earshot) by saying "Zeig mir die Addons". They are not bundled; each is fetched from its original source after you accept its licence notes, which also say what is and is not cleared for commercial use. See [`docs/addons.md`](docs/addons.md).

Security: see [`SECURITY.md`](SECURITY.md).
