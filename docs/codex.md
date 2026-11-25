# AIQORA Studio mit OpenAI Codex

Das Studio läuft auch in Codex: im Terminal, in der IDE-Erweiterung und in der App. Alle drei teilen sich dieselben Einstellungen.

## Einfachster Weg

Öffne Codex, füge den Text aus [`install/start-prompt-andere.md`](../install/start-prompt-andere.md) ein und drücke Enter. Codex erledigt den Rest.

Nutzt du das Studio schon in Claude Code, reicht dort ein Satz: „Richte das Studio auch in Codex ein.“

## Von Hand

1. Studio herunterladen (einmalig):
   ```
   git clone https://github.com/ZeldoGiQ/aiqora-studio ~/aiqora-studio
   ```
2. Einrichten:
   ```
   node ~/aiqora-studio/local/einrichten.mjs codex
   ```
3. Codex ganz schließen und neu öffnen. Dann den Ordner `AIQORA-Studio` in deinem Dokumente-Ordner öffnen und schreiben: „Starte das AIQORA Studio.“

## Was dabei passiert

- In `~/.codex/config.toml` kommen zwei Verbindungen dazu: `aiqora` (erzeugen) und `aiqora-local` (Ordner, Dateien, Schnitte auf deinem Rechner). Die alte Datei wird vorher als `config.toml.vor-aiqora-studio.bak` gesichert.
- Die Befehle des Studios landen als Skills in `~/.agents/skills/` und heißen `aiqora-start`, `aiqora-musikvideo` und so weiter. Du rufst sie mit `$aiqora-start` auf oder sagst einfach, was du willst.
- **In den Einstellungen von Codex steht kein Schlüssel.** Den AIQORA-Schlüssel trägst du einmal im Studio im Browser unter „Einstellungen“ ein (Knopf „AIQORA Studio“ auf dem Desktop oder `node ~/aiqora-studio/local/oberflaeche.mjs`). Er gilt dann für Claude Code, Codex und Antigravity.
- Hast du in Codex schon eine eigene Verbindung namens `aiqora`, bleibt sie unverändert. Mit `--ersetzen` am Ende des Befehls nimmt das Studio stattdessen seine eigene.

## Eigene Anbieter-Schlüssel (BYOK)

Optional und nur mit AIQORA-Abo. Trage sie als Umgebungsvariablen deines Systems ein, nie in eine Datei: `AIQORA_BYOK_WAVESPEED`, `AIQORA_BYOK_FAL`, `AIQORA_BYOK_ELEVENLABS`.

## Aktualisieren

```
cd ~/aiqora-studio
git pull
node local/einrichten.mjs codex
```
