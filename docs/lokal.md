# AIQORA Studio mit einem lokalen Modell

Das Studio läuft auch mit einem Sprachmodell auf deinem eigenen Rechner: mit **Ollama**, **LM Studio** oder **llama.cpp**. Du brauchst dann kein Claude-Abo für den Assistenten.

**Wichtig:** Das lokale Modell ersetzt nur den Assistenten, also das Verstehen und Planen. Bilder, Videos und Musik erzeugt weiter AIQORA, und das kostet weiter Guthaben.

## Was du brauchst

- [Claude Code](https://claude.com/claude-code). Es ist das Programm, in dem das Studio läuft; es spricht dann mit deinem lokalen Modell statt mit Claude.
- Ollama, LM Studio oder llama.cpp mit einem Modell, das **Werkzeuge aufrufen** kann.
- Eine Grafikkarte mit genug Speicher. Faustregel: Das Modell samt Textfenster sollte ganz in die Grafikkarte passen. Bei 12 GB sind das Modelle um 8 Milliarden Parameter, bei 24 GB um 14 bis 20 Milliarden. Passt es nicht ganz hinein, läuft es trotzdem, aber eine Antwort dauert dann Minuten statt Sekunden.

## Einrichten

Sag in Claude Code: „Richte das Studio für ein lokales Modell ein“ (oder tippe `/aiqora-studio:lokal`). Danach liegt auf dem Desktop der Knopf **AIQORA Studio (lokal)**.

Ohne Claude Code im Terminal:

```
node ~/aiqora-studio/local/einrichten.mjs lokal
```

## Benutzen

Doppelklick auf **AIQORA Studio (lokal)**. Es öffnet sich ein Fenster, in dem das Studio mit deinem lokalen Modell läuft.

- Läuft Ollama oder LM Studio noch nicht, startet das Studio es selbst. llama.cpp startest du vorher selbst mit deinem Modell.
- Gibt es mehrere Modelle, fragt das Fenster einmal, welches du willst, und merkt sich die Antwort. Neu auswählen: `node ~/aiqora-studio/local/lokal.mjs --neu`.
- Vor jedem Auftrag, der Guthaben kosten oder etwas löschen kann, fragt das Studio nach. Diese Frage hängt nicht vom Modell ab und lässt sich nicht wegreden.

## Was das Studio dabei für dich regelt

- **Textfenster:** Ollama und LM Studio laden Modelle sonst oft nur mit 4.000 Tokens. Damit vergisst das Modell mitten im Auftrag die Regeln. Das Studio lädt es mit 32.000 Tokens, oder mit so viel, wie das Modell kann. In Ollama legt es dafür eine Variante des Modells an (`aiqora-<Name>`), die nur diese Einstellung ändert und keinen Speicherplatz kostet. Einen anderen Wert setzt du mit der Umgebungsvariable `AIQORA_LOKAL_KONTEXT`.
- **Sparmodus:** Alle AIQORA-Werkzeuge zusammen brauchen rund 30.000 Tokens. Das lokale Modell sieht deshalb nur drei kleine Werkzeuge: Liste, Beschreibung, Aufruf. Andere Plugins und Verbindungen aus deinem Claude Code bleiben in diesem Fenster aus, damit das Textfenster für das Studio reicht.
- **Nichts geht zu Anthropic:** Alle Anfragen des Assistenten gehen an `127.0.0.1`, also an deinen eigenen Rechner.

## Ehrliche Grenzen

- Lokale Modelle sind langsamer als Claude und halten sich schlechter an Anleitungen. Sie erfinden eher etwas, zum Beispiel wofür dein Guthaben reicht. Für aufwendige Abläufe wie Musikvideo oder Cinema Agent ist Claude deutlich zuverlässiger.
- Getestet ist der Weg mit Ollama und Claude Code unter Windows. LM Studio und llama.cpp nutzen dieselbe Schnittstelle, sind aber weniger erprobt.
- Steht in deinen Claude-Einstellungen (`~/.claude/settings.json`, Abschnitt `env`) schon `ANTHROPIC_BASE_URL` oder `ANTHROPIC_MODEL`, gewinnt dieser Eintrag. Das Fenster weist dich darauf hin.

## Codex und Antigravity

Codex kann selbst mit lokalen Modellen starten (`codex --oss --local-provider ollama`). Die Verbindungen des Studios sind dort dieselben wie sonst, siehe [`codex.md`](codex.md); den Sparmodus und die feste Kostenfrage gibt es dort nicht. Antigravity lässt sich nicht auf ein lokales Modell umstellen.
