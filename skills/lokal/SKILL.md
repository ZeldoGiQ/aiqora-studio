---
name: lokal
description: Das AIQORA Studio mit einem lokalen Modell auf dem eigenen Rechner nutzen (Ollama, LM Studio oder llama.cpp) statt mit Claude. Prüft, was installiert ist, und legt den Desktop-Knopf „AIQORA Studio (lokal)“ an.
---

1. `lokal_status` des lokalen Helfers aufrufen.
2. **Kein Programm installiert:** Dem Nutzer in zwei Sätzen sagen, dass er zuerst Ollama (ollama.com/download) oder LM Studio (lmstudio.ai) installieren und dort ein Modell laden muss, das mit Werkzeugen umgehen kann. Ehrlich dazusagen: Brauchbar wird es erst mit einer Grafikkarte ab etwa 12 GB Speicher. Hier anhalten.
3. **Programm da, aber kein Modell:** Sagen, dass noch ein Modell fehlt, und eins vorschlagen, das zur Grafikkarte passt (bis 12 GB: ein Modell um 8 Milliarden Parameter, bis 24 GB: um 14 bis 20 Milliarden). Nur mit ausdrücklichem Ja des Nutzers selbst herunterladen (das sind mehrere Gigabyte). Hier anhalten.
4. **Modell da:** `lokal_knopf_anlegen` aufrufen. Meldet es, dass schon eine andere Datei mit dem Namen da ist, den Nutzer fragen, wie der Knopf heißen soll.
5. Dem Nutzer in höchstens vier Sätzen sagen:
   - Auf dem Desktop liegt jetzt „AIQORA Studio (lokal)“. Ein Doppelklick öffnet ein Fenster, in dem das Studio mit seinem lokalen Modell läuft. Gibt es mehrere Modelle, fragt das Fenster einmal, welches er will.
   - Das lokale Modell ersetzt nur den Assistenten. Bilder, Videos und Musik kommen weiter von AIQORA und kosten weiter Guthaben.
   - Lokale Modelle sind langsamer und machen mehr Fehler als Claude. Deshalb fragt das Studio dort vor jedem Auftrag, der Guthaben kostet, noch einmal nach.
