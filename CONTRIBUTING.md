# Mitarbeiten

## Aufbau

| Ordner | Inhalt |
|---|---|
| `.claude-plugin/` | Plugin-Beschreibung (`plugin.json`) und Marktplatz (`marketplace.json`) |
| `.mcp.json` | Verbindung zu AIQORA und zum lokalen Helfer |
| `skills/` | Die Befehle des Studios, je ein Ordner mit `SKILL.md` |
| `studio-vorlage/` | Dateien, die beim ersten Start in den Studio-Ordner des Nutzers kopiert werden (Anleitung für den Agenten, Dashboard) |
| `local/` | Der lokale Helfer: ein MCP-Server ohne Abhängigkeiten (nur Node.js) |
| `install/` | Einfüge-Prompt und Installationsskripte |
| `docs/` | Zusätzliche Anleitungen |
| `tests/` | Tests für den lokalen Helfer (`npm test`) |

## Grundregel: Dieses Repo ist nur die Bedienung

Das Studio ist ein **dünner Client**. Jeder Befehl ruft genau ein AIQORA-Werkzeug auf und zeigt Plan, Kosten und Ergebnis. Wie Ergebnisse entstehen (Prompts, Abläufe, Planung, Schnittlogik), gehört auf den AIQORA-Server und **nicht** in dieses Repo.

Neue Befehle deshalb so schreiben:
1. Fehlende Angaben in einer Frage klären.
2. Das passende AIQORA-Werkzeug aufrufen, bei größeren Abläufen zuerst mit Vorschau und Kosten.
3. Ergebnis herunterladen und öffnen.
4. Fehlt das Werkzeug auf dem Server: das dem Nutzer sagen, nichts lokal nachbauen.

## Entwickeln

```bash
npm test
```

Den lokalen Helfer direkt starten (spricht MCP über stdin/stdout):

```bash
node local/server.mjs
```

Plugin prüfen:

```bash
claude plugin validate .
```

Jede Änderung braucht einen Eintrag in `CHANGELOG.md` und vor der Veröffentlichung die Freigabe durch AIQORA.
