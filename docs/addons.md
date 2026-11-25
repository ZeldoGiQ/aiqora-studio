# Addons

Addons sind Zusatzprogramme anderer Anbieter für Grafik und Ton. **Sie gehören nicht zum AIQORA Studio und sind bei der Installation nicht dabei.** Du holst sie dir danach selbst dazu, wenn du sie willst. Jedes Addon wird von seiner Originalquelle geladen, und vor der Installation siehst du die Lizenzhinweise und musst zustimmen.

## Installieren

Sag im Studio: „Zeig mir die Addons“ (in Claude Code auch `/aiqora-studio:addons`). Das Studio zeigt, was es gibt, nennt die Lizenzhinweise und installiert erst nach deinem Ja.

Im Terminal:

```
node ~/aiqora-studio/local/addon.mjs                  # Liste mit Lizenzhinweisen und Stand
node ~/aiqora-studio/local/addon.mjs earshot --ja     # installieren; --ja = Lizenzhinweise gelesen
```

Danach das Programm einmal ganz schließen und neu öffnen.

## Was es gibt

Stand der Lizenzangaben: November 2026. Das ist eine Recherche und **keine Rechtsberatung**. Maßgeblich sind die Lizenzen der Anbieter.

### HyperFrames

Erklärgrafiken, Titel, Untertitel und Übergänge als Video. Von HeyGen, [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), Lizenz Apache-2.0.

| Teil | Kommerziell nutzbar? |
|---|---|
| Das Programm und seine Befehle | Ja |
| Lokale Stimme (Kokoro) | Ja |
| Untertitel aus Sprache (Whisper) | Ja |
| **Lokale Musik (MusicGen)** | **Nein.** Nur für nicht-kommerzielle Nutzung freigegeben. Das Studio nimmt Musik deshalb immer von AIQORA. |
| Stimme über ElevenLabs oder HeyGen | Nur mit bezahltem Tarif |
| Soundeffekte aus dem Netz, Lizenz CC0 | Ja |
| Soundeffekte aus dem Netz, Lizenz CC BY | Ja, wenn du den Urheber nennst (z. B. in der Videobeschreibung). HyperFrames legt dafür `CREDITS.md` im Projekt an. |
| Farb-Looks (LUTs), einige Texturen, Freistellen von Personen | Ungeklärt: keine eindeutige Lizenz angegeben. Für kommerzielle Videos besser nicht nutzen oder selbst prüfen. |

HyperFrames sendet von sich aus anonyme Nutzungsdaten an HeyGen. Das Studio schaltet das bei der Installation ab.

### Earshot

Soundeffekte aus einer eigenen Klangbank und Tonprüfung fertiger Videos (Lautheit, Synchronität). Von Leon Lin, [github.com/Leonxlnx/earshot](https://github.com/Leonxlnx/earshot), Lizenz MIT. Lädt einmalig etwa 1 GB.

| Teil | Kommerziell nutzbar? |
|---|---|
| Das Programm | Ja |
| Soundeffekte der Klangbank | Ja. Sie werden auf deinem Rechner erzeugt und gehören dir, ohne Namensnennung. |
| Tonmodelle zum Prüfen (CLAP, AST) | Ja (Apache-2.0 und BSD-3-Clause) |
| Effekt, den du an eine eigene Aufnahme anpasst | Es gilt die Lizenz dieser Aufnahme |

Das Studio installiert eine feste, geprüfte Version von Earshot (v0.4.1).

## Was das Studio nach der Installation tut

- Im Studio-Ordner liegt die Datei `addons.md` mit den Regeln und Lizenzhinweisen der installierten Addons. Der Assistent liest sie beim Start und hält sich daran, zum Beispiel: Musik nie lokal erzeugen.
- Earshot wird als Verbindung eingetragen: für Claude Code in `.mcp.json` im Studio-Ordner (Claude Code fragt beim nächsten Start einmal, ob es sie nutzen darf), für Codex und Antigravity in deren Einstellungen, wenn das Studio dort eingerichtet ist. Eigene Einträge bleiben, wie sie sind.
- Im Fenster „AIQORA Studio (lokal)“ sind Addons aus, damit das Textfenster des lokalen Modells reicht.

## Ob deine fertigen Videos kommerziell nutzbar sind

Das hängt von allem ab, was im Video steckt: von den Bedingungen deines AIQORA-Tarifs für erzeugte Bilder, Videos und Musik und von den Punkten oben für die Addons.
