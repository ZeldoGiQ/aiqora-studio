# AIQORA Studio mit Google Antigravity

Das Studio läuft auch in Antigravity: in der App, in der IDE und im Terminal (`agy`). Alle drei teilen sich dieselben Einstellungen.

## Einfachster Weg

Öffne Antigravity, füge den Text aus [`install/start-prompt.md`](../install/start-prompt.md) ein und drücke Enter. Antigravity erledigt den Rest.

Nutzt du das Studio schon in Claude Code, reicht dort ein Satz: „Richte das Studio auch in Antigravity ein.“

## Von Hand

1. Studio herunterladen (einmalig):
   ```
   git clone https://github.com/ZeldoGiQ/aiqora-studio ~/aiqora-studio
   ```
2. Einrichten:
   ```
   node ~/aiqora-studio/local/einrichten.mjs antigravity
   ```
3. Antigravity ganz schließen und neu öffnen. Dann den Ordner `AIQORA-Studio` in deinem Dokumente-Ordner öffnen und schreiben: „Starte das AIQORA Studio.“

## Was dabei passiert

- In `~/.gemini/config/mcp_config.json` kommen zwei Verbindungen dazu: `aiqora` (erzeugen) und `aiqora-local` (Ordner, Dateien, Schnitte auf deinem Rechner). Eine vorhandene Datei wird vorher als `mcp_config.json.vor-aiqora-studio.bak` gesichert.
- Die Befehle des Studios landen als Skills in `~/.gemini/config/skills/` und heißen `aiqora-start`, `aiqora-musikvideo` und so weiter. Du rufst sie mit `/aiqora-start` auf oder sagst einfach, was du willst.
- **In den Einstellungen von Antigravity steht kein Schlüssel.** Den AIQORA-Schlüssel trägst du einmal im Studio im Browser unter „Einstellungen“ ein (Knopf „AIQORA Studio“ auf dem Desktop oder `node ~/aiqora-studio/local/oberflaeche.mjs`). Er gilt dann für Claude Code, Codex und Antigravity.
- Hast du in Antigravity schon eine eigene Verbindung namens `aiqora`, bleibt sie unverändert. Mit `--ersetzen` am Ende des Befehls nimmt das Studio stattdessen seine eigene.

## Lokale Modelle

Antigravity selbst lässt sich nicht auf ein lokales Modell umstellen. Für Ollama, LM Studio und llama.cpp siehe [`lokal.md`](lokal.md).

## Aktualisieren

```
cd ~/aiqora-studio
git pull
node local/einrichten.mjs antigravity
```
