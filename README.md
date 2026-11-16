# AIQORA Studio

**Dein fertiges KI-Studio für Bilder, Videos, Musik und Musikvideos, direkt in Claude Code. Ohne Programmieren.**

*[English version below](#english)*

AIQORA Studio verbindet Claude Code mit [AIQORA](https://aiqora.ai). Du sagst in normaler Sprache, was du willst („Mach mir ein Musikvideo zu meinem Song“), das Studio kümmert sich um den Rest: Kosten vorher ansagen, erzeugen lassen, herunterladen, öffnen.

- **Alles in einem Ordner:** jedes Vorhaben bekommt einen Projektordner mit Bildern, Clips, Ton und dem fertigen Ergebnis.
- **Dashboard:** Guthaben, letzte Aufträge und Projekte auf einen Blick.
- **Spart deine Claude-Tokens:** Aufwendige Abläufe (Musikvideo, Cinema Agent, Short Drama) laufen als ein einziger Auftrag bei AIQORA, nicht als hunderte Einzelschritte auf deinem Rechner.
- **Updates inklusive:** neue Funktionen kommen automatisch.

## Was du brauchst

1. [Claude Code](https://claude.com/claude-code) (Desktop-App oder Terminal)
2. Ein [AIQORA-Konto](https://aiqora.ai) mit Guthaben
3. Optional: [ffmpeg](https://ffmpeg.org) für einfache Schnitte auf deinem Rechner

## Installation in 3 Schritten

**Einfachster Weg:** Öffne Claude Code, füge den Text aus [`install/start-prompt.md`](install/start-prompt.md) ein und drücke Enter. Claude erledigt den Rest.

**Oder von Hand:**

1. In Claude Code eintippen:
   ```
   /plugin marketplace add aiqora/aiqora-studio
   /plugin install aiqora-studio@aiqora
   ```
2. Wenn Claude Code danach fragt: deinen AIQORA-Schlüssel eintragen. Du findest ihn unter [aiqora.ai/settings](https://aiqora.ai/settings) bei „MCP API Keys“. Er wird sicher in deinem System gespeichert und nie im Chat angezeigt.
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
| `/aiqora-studio:update` | Auf die neueste Version bringen |
| `/aiqora-studio:hilfe` | Hilfe |

Du musst keinen Befehl kennen: Sag einfach, was du willst.

## Kosten

Erzeugen kostet AIQORA-Credits. Das Studio nennt die Kosten **vor** jedem Auftrag und fragt bei größeren Beträgen nach. Fehlgeschlagene Aufträge bucht AIQORA zurück.

## Eigene Schlüssel (BYOK)

Mit einem AIQORA-Abo kannst du für einfache Einzelbilder und -clips auch deine eigenen Schlüssel von Drittanbietern nutzen. **Deine Schlüssel bleiben auf deinem Rechner.** Claude Code speichert sie im sicheren Speicher deines Systems, AIQORA bekommt sie nie zu sehen, und Aufträge mit eigenem Schlüssel laufen direkt von deinem Rechner zum Anbieter. Die Kosten beim Anbieter trägst du selbst.

Fertige Abläufe wie Musikvideo, Cinema Agent und Short Drama laufen immer über AIQORA und kosten Credits.

## Codex

Das Studio funktioniert auch mit OpenAI Codex. Siehe [`docs/codex.md`](docs/codex.md).

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
   /plugin marketplace add aiqora/aiqora-studio
   /plugin install aiqora-studio@aiqora
   ```
2. When asked, enter your AIQORA key from [aiqora.ai/settings](https://aiqora.ai/settings) ("MCP API Keys"). It is stored in your system's secure storage and never shown in the chat.
3. Restart Claude Code and type `/aiqora-studio:start`.

Generating costs AIQORA credits; the studio always tells you the cost first. Subscribers can bring their own provider keys (BYOK) for simple single generations. **BYOK keys never leave your computer** and are never sent to AIQORA. Full workflows (music video, Cinema Agent, Short Drama) always run on AIQORA.

Codex: see [`docs/codex.md`](docs/codex.md). Security: see [`SECURITY.md`](SECURITY.md).
