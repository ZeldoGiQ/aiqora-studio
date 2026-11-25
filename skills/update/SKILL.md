---
name: update
description: AIQORA Studio auf die neueste Version bringen und sagen, was neu ist.
---

1. **In Claude Code:** Dem Nutzer sagen, dass er `/plugin` tippt, den Marktplatz **aiqora** aktualisiert und **AIQORA Studio** aktualisiert. Alternativ, wenn der Nutzer zustimmt, im Terminal ausführen:
   `claude plugin marketplace update aiqora` und danach `claude plugin update aiqora-studio@aiqora`.
   **In Codex oder Antigravity:** `studio_info` nennt den Programmordner des Studios (`programm_ordner`). Wenn der Nutzer zustimmt, dort `git pull` ausführen und danach `programm_einrichten` für dieses Programm aufrufen, damit die Befehle des Studios auf dem neuen Stand sind.
2. Danach das Programm neu starten.
3. In zwei bis drei Sätzen sagen, was neu ist (aus den Neuigkeiten, die der AIQORA-Server meldet, sonst aus `CHANGELOG.md` im Programmordner des Studios).
4. Hinweis: Neue Funktionen auf dem AIQORA-Server sind sofort da, auch ohne Update.
