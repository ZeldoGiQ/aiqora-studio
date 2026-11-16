# Sicherheit

## Sicherheitsproblem melden

Bitte melde Sicherheitsprobleme **nicht** öffentlich als GitHub-Issue, sondern vertraulich an: **{{SICHERHEITS_KONTAKT}}**

Hilfreich sind: was passiert ist, wie man es nachstellen kann und welche Version du nutzt. Wir melden uns innerhalb von 3 Werktagen.

## Grundsätze dieses Projekts

- **Schlüssel:** Der AIQORA-Schlüssel und eigene Anbieter-Schlüssel (BYOK) werden von Claude Code im sicheren Speicher des Betriebssystems abgelegt. Sie stehen nie in Dateien dieses Repos, nie im Chat und nie in Protokollen.
- **BYOK bleibt lokal:** Eigene Anbieter-Schlüssel werden nie an AIQORA übertragen. Aufträge mit eigenem Schlüssel gehen direkt vom Rechner des Nutzers zum Anbieter.
- **Dateizugriff:** Der lokale Helfer liest und schreibt nur innerhalb des Studio-Ordners.
- **Netzwerk:** Der lokale Helfer lädt nur über `https://` herunter und hoch.
- **Keine Ausführung von Fremdcode:** Der lokale Helfer startet nur `ffmpeg`/`ffprobe` mit festen Argumenten, nie eine Shell.

## Was du selbst tun solltest

- Hast du einen Schlüssel versehentlich in den Chat oder in eine Datei geschrieben: sofort beim Anbieter löschen und neu erzeugen. Für AIQORA unter [aiqora.ai/settings](https://aiqora.ai/settings) bei „MCP API Keys“.
