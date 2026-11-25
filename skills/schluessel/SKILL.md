---
name: schluessel
description: Zeigen, welche Schlüssel eingerichtet sind (AIQORA und eigene Anbieter-Schlüssel), und erklären, wie man sie einträgt oder ändert. Zeigt nie den Wert eines Schlüssels.
---

1. `byok_status` des lokalen Helfers aufrufen. Er meldet nur, **ob** ein Schlüssel eingetragen ist, nie den Wert.
2. Dem Nutzer in einer kurzen Liste sagen, welche Schlüssel eingerichtet sind.
3. Eintragen oder ändern:
   - **AIQORA-Schlüssel:** im Studio im Browser unter „Einstellungen“ (`oberflaeche_oeffnen` öffnet es). Er wird dort verschlüsselt gespeichert und gilt für alle Programme, die das Studio nutzen (Claude Code, Codex, Antigravity). Danach das Programm neu starten.
   - **Eigene Anbieter-Schlüssel in Claude Code:** Der Nutzer tippt `/plugin`, wählt **AIQORA Studio** und dort die Einstellungen. Die Eingabe ist verdeckt und wird im sicheren Speicher seines Systems abgelegt. Danach Claude Code neu starten.
   - **Eigene Anbieter-Schlüssel in anderen Programmen (Codex, Antigravity):** als Umgebungsvariable des Systems eintragen (`AIQORA_BYOK_WAVESPEED`, `AIQORA_BYOK_FAL`, `AIQORA_BYOK_ELEVENLABS`), nie in eine Datei. Dem Nutzer Schritt für Schritt sagen, wo er das in seinem System eintippt. Danach das Programm neu starten.
4. Wichtig dazusagen:
   - Eigene Schlüssel bleiben auf dem Rechner und gehen nie an AIQORA.
   - Sie gelten nur für einfache Einzelbilder, -clips und Stimmen und brauchen ein AIQORA-Abo.
   - Kosten beim Anbieter trägt der Nutzer selbst.
5. **Nie** nach dem Schlüssel im Chat fragen. Schreibt der Nutzer ihn trotzdem hinein: nicht wiederholen, nicht speichern, ihm sagen, dass er ihn beim Anbieter löschen und neu erzeugen soll.
