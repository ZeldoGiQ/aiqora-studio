---
name: modelle
description: Zeigen, welche Modelle AIQORA anbietet, was sie können und was sie kosten, zum Beispiel bei „Welche Videomodelle gibt es?“, „Was kostet ein Bild?“ oder „Welches Modell kann Ton?“. Öffnet auf Wunsch die Modellübersicht im Studio.
---

1. `modelle_liste` des lokalen Helfers aufrufen. Nennt der Nutzer eine Art (Video, Bild, Musik, Stimme, Lippensynchron), mit `art`. Fragt er nach einer Fähigkeit oder einem Namen (z. B. „mit Ton“, „Kling“), zusätzlich mit `suche`. Ohne beides kommt eine Übersicht je Art.
2. Kurz antworten: höchstens fünf Modelle nennen, jeweils mit Preis und dem, was sie besonders macht. Das günstigste immer dabei. Die übrigen nur zählen („und 40 weitere“).
3. Anbieten, die ganze Übersicht zu zeigen, und bei einem Ja `oberflaeche_oeffnen` mit `seite: "modelle"` aufrufen. Dort stehen alle Modelle mit Preistabellen.
4. **Nie Preise oder Modelle aus dem Gedächtnis nennen.** Sie ändern sich; `modelle_liste` holt sie aktuell von AIQORA. Meldet das Werkzeug `veraltet`, das in einem Satz dazusagen.
5. Will der Nutzer wissen, was ein bestimmter Auftrag kostet: die Kostenvorschau von AIQORA nutzen (`aiqora_get_quote`), nicht selbst rechnen.
